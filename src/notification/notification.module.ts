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
import { ConfigModule } from 'src/config/config.module';
import {
  Transaction,
  TransactionSchema,
} from 'src/transaction/schemas/transaction.schema';
import { Product, ProductSchema } from 'src/products/entities/product.entity';
import {
  Quantity,
  QuantitySchema,
} from 'src/quantity/entities/quantity.entity';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import {
  Warehouse,
  WarehouseSchema,
} from 'src/warehouse/schemas/warehouse.schema';
import SendEmail from 'src/utils/SendEmail';
import { PdfService } from 'src/transaction/services/pdf.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Quantity.name, schema: QuantitySchema },
      { name: User.name, schema: UserSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationHelper,
    NotificationTriggerService,
    SendEmail,
    PdfService,
  ],
  exports: [NotificationTriggerService],
})
export class NotificationModule {}
