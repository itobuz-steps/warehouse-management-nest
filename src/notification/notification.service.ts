import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Notification } from './entities/notification.entity';
import {
  Subscription,
  SubscriptionDocument,
} from './entities/subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,

    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
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
    status: string,
    reporterId: string,
  ) {
    await this.notificationModel.updateMany(
      { transactionId },
      {
        ...(status === 'shipped' && { isShipped: true }),
        ...(status === 'cancelled' && { isCancelled: true }),
        reportedBy: reporterId,
        title: `Shipment ${status}`,
      },
    );
  }
}
