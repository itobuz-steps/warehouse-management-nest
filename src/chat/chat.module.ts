import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSession, ChatSessionSchema } from './entities/chat-session.entity';
import { User, UserSchema } from 'src/auth/entities/auth.entity';

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
