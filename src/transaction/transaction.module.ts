import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import {
  Warehouse,
  WarehouseSchema,
} from '../warehouse/schemas/warehouse.schema';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import { PdfService } from './services/pdf.service';
import {
  Quantity,
  QuantitySchema,
} from 'src/quantity/entities/quantity.entity';
import { ConfigModule } from '@nestjs/config';
import { Product, ProductSchema } from 'src/products/entities/product.entity';
import { NotificationService } from 'src/notification/notification.service';
import {
  Notification,
  NotificationSchema,
} from 'src/notification/entities/notification.entity';
import SendEmail from 'src/utils/SendEmail';
import { NotificationModule } from 'src/notification/notification.module';
import {
  Subscription,
  SubscriptionSchema,
} from 'src/notification/entities/subscription.entity';
import { Batch, BatchSchema } from 'src/batch/schemas/batch.schema';
import {
  VariantStock,
  VariantStockSchema,
} from 'src/variant-stock/schemas/variant-stock.schema';
import { VariantStockModule } from 'src/variant-stock/variant-stock.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Quantity.name, schema: QuantitySchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Batch.name, schema: BatchSchema },
      { name: VariantStock.name, schema: VariantStockSchema },
    ]),
    NotificationModule,
    VariantStockModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, PdfService, NotificationService, SendEmail],
  exports: [SendEmail],
})
export class TransactionModule {}
