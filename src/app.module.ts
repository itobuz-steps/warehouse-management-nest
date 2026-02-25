import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './config/db.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { QuantityModule } from './quantity/quantity.module';
import { ProfileModule } from './profile/profile.module';
import { AdminModule } from './admin/admin.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationModule } from './notification/notification.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TransactionModule } from './transaction/transaction.module';
import { SupplierModule } from './supplier/supplier.module';
import { CustomerModule } from './customer/customer.module';
import { VariantModule } from './variant/variant.module';
import { TransactionLogsModule } from './transaction-logs/transaction-logs.module';
import { BatchModule } from './batch/batch.module';
import { VariantStockModule } from './variant-stock/variant-stock.module';
import configService from './config/config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configService],
    }),
    DbModule,
    AuthModule,
    ProfileModule,
    WarehouseModule,
    ProductsModule,
    QuantityModule,
    AdminModule,
    DashboardModule,
    NotificationModule,
    AnalyticsModule,
    TransactionModule,
    SupplierModule,
    CustomerModule,
    VariantModule,
    TransactionLogsModule,
    BatchModule,
    VariantStockModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
