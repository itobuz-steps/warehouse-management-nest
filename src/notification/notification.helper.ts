import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';
import { sendBrowserNotification } from './notification.sender';
import { User, UserDocument } from 'src/auth/entities/auth.entity';

import SendEmail from 'src/utils/SendEmail';
import { NOTIFICATION_TYPES } from './notificationTypes';
import { Product } from 'src/products/entities/product.entity';
import { WarehouseDocument } from 'src/warehouse/schemas/warehouse.schema';

export interface NotificationPayload {
  users: UserDocument[];
  type: NOTIFICATION_TYPES | string;
  title: string;
  message: string;

  relatedProduct?: Types.ObjectId;

  product: Product;
  warehouse: WarehouseDocument;
  warehouseId?: Types.ObjectId;
  transactionId?: Types.ObjectId;
  transactionPerformedBy?: Types.ObjectId;
}

interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface LeanSubscription {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  expirationTime?: Date | null;
  keys: SubscriptionKeys;
}

@Injectable()
export class NotificationHelper {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,

    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,

    private readonly sendEmail: SendEmail,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async notify(payload: NotificationPayload) {
    if (!payload.users?.length) return;

    // Convert all IDs to strings for the DB notification record
    const stringIds: string[] = payload.users.map((u) => {
      const id = u._id;
      return id instanceof Types.ObjectId ? id.toHexString() : String(id);
    });

    const freshUsers = await this.userModel
      .find({ _id: { $in: stringIds } })
      .select('_id email preferences')
      .lean();

    const pushUsers = freshUsers.filter((user) => !!user.preferences?.push);

    const pushUserIds = pushUsers.map((u) =>
      u._id instanceof Types.ObjectId ? u._id.toHexString() : String(u._id),
    );

    // Create the database record
    await this.notificationModel.create({
      userIds: stringIds,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      relatedProduct: payload.relatedProduct,
      warehouse: payload.warehouseId,
      transactionId: payload.transactionId,
      transactionPerformedBy: payload.transactionPerformedBy,
    });

    if (pushUserIds.length) {
      const subscriptions = await this.subscriptionModel
        .find({ userId: { $in: pushUserIds } })
        .lean()
        .exec();

      if (subscriptions.length) {
        await sendBrowserNotification(subscriptions, {
          title: payload.title,
          body: payload.message,
          type: payload.type,
        });
      }
    }

    // Handle Emails
    if (payload.product && payload.warehouse) {
      const emailPromises = payload.users.map(async (user) => {
        try {
          if (
            (payload.type as NOTIFICATION_TYPES) ===
            NOTIFICATION_TYPES.LOW_STOCK
          ) {
            await this.sendEmail.sendLowStockEmail(
              user.email,
              user,
              payload.product,
              payload.warehouse,
            );
          } else if (
            (payload.type as NOTIFICATION_TYPES) ===
            NOTIFICATION_TYPES.PENDING_SHIPMENT
          ) {
            await this.sendEmail.sendPendingShipmentEmail(
              user.email,
              user,
              payload.product,
              payload.warehouse,
            );
          }
        } catch (err) {
          console.error(`Email failed for ${user.email}:`, err);
        }
      });

      await Promise.all(emailPromises);
    }
  }
}
