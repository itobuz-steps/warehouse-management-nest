import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';
import { sendBrowserNotification } from './notification.sender';
import { UserDocument } from 'src/auth/entities/auth.entity';

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

@Injectable()
export class NotificationHelper {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,

    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,

    private readonly sendEmail: SendEmail,
  ) {}

  async notify(payload: NotificationPayload) {
    if (!payload.users?.length) return;

    const userIds = payload.users.map((u) => new Types.ObjectId(u._id));

    // 1️⃣ Save notification in DB
    await this.notificationModel.create({
      userIds,
      type: payload.type,
      title: payload.title,
      message: payload.message,

      relatedProduct: payload.relatedProduct,
      warehouse: payload.warehouseId, // ✅ FIXED
      transactionId: payload.transactionId,
      transactionPerformedBy: payload.transactionPerformedBy,
    });

    // 2️⃣ Fetch subscriptions
    const subscriptions = await this.subscriptionModel.find({
      userId: { $in: userIds },
    });

    // 3️⃣ Send browser push
    await sendBrowserNotification(subscriptions, {
      title: payload.title,
      message: payload.message,
      type: payload.type,
    });

    // 4️⃣ Send Emails (same logic as Express)
    if (payload.product && payload.warehouse) {
      await Promise.all(
        payload.users.map(async (user) => {
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
            console.error('Email failed:', user.email, err);
          }
        }),
      );
    }
  }
}
