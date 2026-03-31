import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Notification } from './entities/notification.entity';
import {
  Subscription,
  SubscriptionDocument,
} from './entities/subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { NotificationQueryDto } from './dto/notificationQuery.dto';

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
      return existing;
    }

    return await this.subscriptionModel.create(subscriptionData);
  }

  async getNotifications(userId: string, query: NotificationQueryDto) {
    const userIdObject = new Types.ObjectId(userId);
    const match: PipelineStage.Match['$match'] = {
      userIds: { $in: [userIdObject] },
    };

    if (query.unread) {
      match.seen = !query.unread;
    }

    if (query.type) {
      match.type = query.type;
    }
    const notifications = await this.notificationModel.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: query.offset || 0 },
      { $limit: query.limit || 10 },

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
      userIds: { $in: [userIdObject] },
      seen: false,
    });
    return { notifications, unseenCount };
  }

  async markAllAsSeen(userId: string) {
    if (!userId) {
      throw new Error('User ID missing from request');
    }

    const userIdObject = new Types.ObjectId(userId);

    const result = await this.notificationModel.updateMany(
      {
        userIds: { $in: [userIdObject] },
        seen: false,
      },
      { $set: { seen: true } },
    );

    return result;
  }
}
