import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
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
import { PopulatedTransaction } from 'src/transaction/types/types';

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
      Object.assign(existing, subscriptionData);
      return await existing.save();
    }

    return await this.subscriptionModel.create(subscriptionData);
  }

  async getNotifications(userId: string, offset = 0) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const notifications = await this.notificationModel.aggregate([
      { $match: { userIds: { $in: [userObjectId] } } },
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
      userIds: { $in: [userObjectId] },
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
    reporterId: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1️⃣ Fetch Transaction
      const transaction = await this.transactionModel
        .findById(transactionId)
        .session(session)
        .populate<PopulatedTransaction>('product performedBy sourceWarehouse');

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // 2️⃣ Load Product & Warehouse
      const product = await this.productModel.findById(transaction.product);
      const warehouse = await this.warehouseModel.findById(
        transaction.sourceWarehouse,
      );

      if (!product || !warehouse) {
        throw new Error('Product or Warehouse not found');
      }

      // 3️⃣ If Cancelled → Restore Quantity
      if (status === 'cancelled') {
        const quantityRecord = await this.quantityModel
          .findOne({
            warehouseId: transaction.sourceWarehouse,
            productId: transaction.product,
          })
          .session(session);

        if (!quantityRecord) {
          throw new Error('Quantity record not found');
        }

        quantityRecord.quantity += transaction.quantity;
        await quantityRecord.save({ session });
      }

      // 4️⃣ Update Shipment Status
      transaction.shipment =
        status === 'shipped'
          ? SHIPMENT_TYPES.SHIPPED
          : SHIPMENT_TYPES.CANCELLED;

      await transaction.save({ session });

      // 5️⃣ Update Notifications
      await this.notificationModel.updateMany(
        { transactionId: transaction._id },
        {
          title:
            status === 'shipped'
              ? 'Pending Shipment Alert: Shipped'
              : 'Pending Shipment Alert: Cancelled',

          ...(status === 'shipped' && { isShipped: true }),
          ...(status === 'cancelled' && { isCancelled: true }),

          reportedBy: reporterId,

          message:
            status === 'shipped'
              ? `Shipment done for ${product.name} from ${warehouse.name} of Quantity: ${transaction.quantity}.`
              : `Shipment Cancelled for ${product.name} from ${warehouse.name} of Quantity: ${transaction.quantity}.`,
        },
        { session },
      );

      // 6️⃣ Send Email to Customer
      if (status === 'shipped') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await this.sendEmail.sendProductShippedEmailToCustomer(transaction);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
