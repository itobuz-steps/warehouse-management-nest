import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
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

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<Transaction>,

    @InjectModel(Product.name)
    private productModel: Model<Product>,

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
      // 1. Match the strings (since your DB stores them as strings)
      { $match: { userIds: { $in: [userId] } } },
      { $sort: { createdAt: -1 } },
      { $skip: offset },
      { $limit: 10 },

      // 2. Lookup with Type Conversion for 'transactionPerformedBy'
      {
        $lookup: {
          from: 'users',
          let: { performerId: '$transactionPerformedBy' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', { $toObjectId: '$$performerId' }],
                },
              },
            },
          ],
          as: 'user',
        },
      },
      // Use preserveNullAndEmptyArrays so notifications don't vanish if a user is deleted
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // 3. Lookup with Type Conversion for 'reportedBy'
      {
        $lookup: {
          from: 'users',
          let: { reporterId: '$reportedBy' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ['$$reporterId', null] }, // Prevent errors if field is missing
                    { $eq: ['$_id', { $toObjectId: '$$reporterId' }] },
                  ],
                },
              },
            },
          ],
          as: 'reportedByUser',
        },
      },
      {
        $unwind: { path: '$reportedByUser', preserveNullAndEmptyArrays: true },
      },

      {
        $addFields: {
          performedByName: { $ifNull: ['$user.name', 'System'] },
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
    if (!userId) {
      throw new Error('User ID missing from request');
    }

    const result = await this.notificationModel.updateMany(
      {
        userIds: { $in: [userId] },
        seen: false,
      },
      { $set: { seen: true } },
    );

    return result;
  }

  async updateShipmentStatus(
    transactionId: string,
    status: 'shipped' | 'cancelled',
    reporterId: string,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const transaction = await this.transactionModel
        .findById(transactionId)
        .populate('products.product')
        .populate('products.variants.variant')
        .populate('sourceWarehouse')
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

          reportedBy: new Types.ObjectId(reporterId),

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
