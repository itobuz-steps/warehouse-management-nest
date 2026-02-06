import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from './entities/notification.entity';
import {
  Subscription,
  SubscriptionSchema,
} from './entities/subscription.entity';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationHelper } from './notification.helper';
import { NotificationTriggerService } from './notification-trigger.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationHelper,
    NotificationTriggerService,
  ],
  exports: [NotificationTriggerService],
})
export class NotificationModule {}
