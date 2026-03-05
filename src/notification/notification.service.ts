import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { Notification } from './entities/notification.entity';
import {
  Subscription,
  SubscriptionDocument,
} from './entities/subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import SendEmail from 'src/utils/SendEmail';
import { Product } from 'src/products/entities/product.entity';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';
import { Quantity } from 'src/quantity/entities/quantity.entity';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { SHIPMENT_TYPES } from 'src/transaction/constants/shipmentConstants';
import { PopulatedTransactionForPdfGeneration } from 'src/transaction/types/types';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Customer } from 'src/customer/entities/customer.entity';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { UserDocument } from 'src/auth/entities/auth.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,

    @InjectModel(Product.name)
    private productModel: Model<Product>,

    @InjectModel(Supplier.name)
    private supplierModel: Model<Supplier>,

    @InjectModel(Customer.name)
    private customerModel: Model<Customer>,

    @InjectModel(Warehouse.name)
    private warehouseModel: Model<Warehouse>,

    @InjectModel(Quantity.name)
    private quantityModel: Model<Quantity>,

    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,

    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,

    @InjectConnection() private readonly connection: Connection,

    private readonly sendEmail: SendEmail,

    private readonly logsService: TransactionLogsService,
  ) {}

  async subscribe(
    userId: string,
    payload: SubscribeDto,
  ): Promise<SubscriptionDocument> {
    const subscriptionData: SubscribeDto & { userId: string } = {
      ...payload,
      userId,
    };

    if (!subscriptionData.endpoint) {
      throw new NotFoundException('Missing endpoint');
    }

    const existing = await this.subscriptionModel.findOne({
      userId,
      endpoint: subscriptionData.endpoint,
    });

    if (existing) {
      return existing;
    }

    return await this.subscriptionModel.create(subscriptionData);
  }

  async getNotifications(userId: string, offset = 0) {
    const notifications = await this.notificationModel.aggregate([
      { $match: { userIds: { $in: [userId] } } },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: 10 },

      {
        $lookup: {
          from: 'users',
          localField: 'transactionPerformedBy',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },

      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reportedByUser',
        },
      },
      {
        $unwind: { path: '$reportedByUser', preserveNullAndEmptyArrays: true },
      },

      {
        $addFields: {
          performedByName: '$user.name',
          performedByImage: '$user.profileImage',
          reportedByName: '$reportedByUser.name',
        },
      },

      { $unset: ['user', 'reportedByUser'] },
    ]);

    const unseenCount = await this.notificationModel.countDocuments({
      userIds: { $in: [userId] },
      seen: false,
    });

    return { notifications, unseenCount };
  }

  async markAllAsSeen(userId: string) {
    return this.notificationModel.updateMany(
      { userIds: { $in: [new mongoose.Types.ObjectId(userId)] } },
      { $set: { seen: true } },
    );
  }

  async updateShipmentStatus(
    transactionId: string,
    status: 'shipped' | 'cancelled',
    reporter: UserDocument,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const transaction = await this.transactionModel
        .findOne({ _id: new Types.ObjectId(transactionId) })
        .populate('products.product')
        .populate('products.variants.variant')
        .populate('sourceWarehouse')
        .populate('supplier customer')
        .session(session)
        .lean<PopulatedTransactionForPdfGeneration>();

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const warehouse = transaction.sourceWarehouse;

      let totalQuantity = 0;

      if (status === 'cancelled') {
        for (const product of transaction.products) {
          for (const variantEntry of product.variants) {
            totalQuantity += variantEntry.quantity;

            const quantityRecord = await this.quantityModel
              .findOne({
                warehouseId: warehouse?._id,
                variantId: variantEntry.variant._id,
              })
              .session(session);

            if (!quantityRecord) {
              throw new NotFoundException('Quantity record not found');
            }

            quantityRecord.quantity += variantEntry.quantity;
            await quantityRecord.save({ session });
          }
        }
      }

      transaction.shipment =
        status === 'shipped'
          ? SHIPMENT_TYPES.SHIPPED
          : SHIPMENT_TYPES.CANCELLED;

      await transaction.save({ session });

      const variantNames = transaction.products
        .flatMap((product) => product.variants)
        .map((v) => v.variant.sku)
        .filter((name): name is string => Boolean(name))
        .join(', ');

      await this.notificationModel.updateMany(
        { transactionId: transaction._id },
        {
          title:
            status === 'shipped'
              ? 'Pending Shipment Alert: Shipped'
              : 'Pending Shipment Alert: Cancelled',

          ...(status === 'shipped' && { isShipped: true }),
          ...(status === 'cancelled' && { isCancelled: true }),

          reportedBy: new Types.ObjectId(reporter._id),

          message:
            status === 'shipped'
              ? `Shipment done for ${variantNames} from ${warehouse?.name} of Quantity: ${totalQuantity}.`
              : `Shipment Cancelled for ${variantNames} from ${warehouse?.name} of Quantity: ${totalQuantity}.`,
        },
        { session },
      );

      if (status === 'shipped') {
        await this.sendEmail.sendProductShippedEmailToCustomer(transaction);
      } else {
        await this.sendEmail.sendProductCancelEmailToCustomer(transaction);
      }

      await session.commitTransaction();

      const previousStatus = transaction.shipment;
      const newStatus =
        status === 'shipped'
          ? SHIPMENT_TYPES.SHIPPED
          : SHIPMENT_TYPES.CANCELLED;

      await this.logsService.createLog({
        action:
          status === 'shipped'
            ? LOG_ACTION.SHIPMENT_SHIPPED
            : LOG_ACTION.SHIPMENT_CANCELLED,

        entityType: LOG_ENTITY_TYPE.TRANSACTION,
        entityId: transaction._id.toString(),
        performedBy: reporter,

        metadata: {
          shipment: {
            previousStatus,
            newStatus,
          },
          warehouse: warehouse && {
            warehouseId: warehouse._id.toString(),
            name: warehouse.name,
          },
          customer: {
            customerId: transaction?.customer._id.toString(),
            name: transaction.customer.name as string,
            email: transaction.customer.email,
          },
          products: transaction.products.flatMap((product) =>
            product.variants.map((variantEntry) => ({
              productId: product.product._id.toString(),
              productName: product.product.name,
              variantId: variantEntry.variant._id.toString(),
              sku: variantEntry.variant.sku,
              quantity: variantEntry.quantity,
            })),
          ),
        },
      });

      return {
        success: true,
        message:
          status === 'shipped'
            ? 'Status Changed to Shipped Successfully'
            : 'Shipment cancelled and stock reverted successfully',
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
