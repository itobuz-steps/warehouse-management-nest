import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notification.entity';
import { Subscription } from './entities/subscription.entity';
import { sendBrowserNotification } from './notification.sender';

export class NotificationHelper {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,

    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
  ) {}

  async notify(payload: {
    users: any[];
    type: string;
    title: string;
    message: string;
    relatedProduct?: any;
    warehouse?: any;
    transactionId?: any;
    transactionPerformedBy?: string;
  }) {
    const userIds = payload.users.map((u) => u._id);

    await this.notificationModel.create({
      userIds,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      relatedProduct: payload.relatedProduct,
      warehouse: payload.warehouse,
      transactionId: payload.transactionId,
      transactionPerformedBy: payload.transactionPerformedBy,
    });

    const subscriptions = await this.subscriptionModel.find({
      userId: { $in: userIds },
    });

    await sendBrowserNotification(subscriptions, {
      title: payload.title,
      message: payload.message,
      type: payload.type,
    });
  }
}
