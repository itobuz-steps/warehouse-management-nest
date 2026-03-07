import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSession, ChatSessionSchema } from './entities/chat-session.entity';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import { Product, ProductSchema } from 'src/products/entities/product.entity';
import {
  Quantity,
  QuantitySchema,
} from 'src/quantity/entities/quantity.entity';
import {
  Warehouse,
  WarehouseSchema,
} from 'src/warehouse/schemas/warehouse.schema';
import {
  Transaction,
  TransactionSchema,
} from 'src/transaction/schemas/transaction.schema';
import { Variant, VariantSchema } from 'src/variant/schemas/variant.schema';
import {
  VariantStock,
  VariantStockSchema,
} from 'src/variant-stock/schemas/variant-stock.schema';
import {
  Supplier,
  SupplierSchema,
} from 'src/supplier/entities/supplier.entity';
import {
  Customer,
  CustomerSchema,
} from 'src/customer/entities/customer.entity';
import { Batch, BatchSchema } from 'src/batch/schemas/batch.schema';
import {
  TransactionLog,
  TransactionLogSchema,
} from 'src/transaction-logs/entities/transaction-log.entity';

// Import dependent modules that export their services
import { ProductsModule } from 'src/products/products.module';
import { QuantityModule } from 'src/quantity/quantity.module';
import { TransactionModule } from 'src/transaction/transaction.module';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { WarehouseModule } from 'src/warehouse/warehouse.module';
import { SupplierModule } from 'src/supplier/supplier.module';
import { CustomerModule } from 'src/customer/customer.module';
import { BatchModule } from 'src/batch/batch.module';
import { AdminModule } from 'src/admin/admin.module';
import { TransactionLogsModule } from 'src/transaction-logs/transaction-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Quantity.name, schema: QuantitySchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Variant.name, schema: VariantSchema },
      { name: VariantStock.name, schema: VariantStockSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Batch.name, schema: BatchSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
    ]),
    ProductsModule,
    QuantityModule,
    TransactionModule,
    DashboardModule,
    AnalyticsModule,
    WarehouseModule,
    SupplierModule,
    CustomerModule,
    BatchModule,
    AdminModule,
    TransactionLogsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
