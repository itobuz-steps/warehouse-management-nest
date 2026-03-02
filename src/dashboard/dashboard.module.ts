// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transaction,
  TransactionSchema,
} from 'src/transaction/schemas/transaction.schema';
import { Product, ProductSchema } from 'src/products/entities/product.entity';
import {
  Warehouse,
  WarehouseSchema,
} from 'src/warehouse/schemas/warehouse.schema';
import {
  Quantity,
  QuantitySchema,
} from 'src/quantity/entities/quantity.entity';
import { ExcelService } from 'src/helper/excelGenerator';
import { User, UserSchema } from 'src/auth/entities/auth.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Quantity.name, schema: QuantitySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, ExcelService],
  exports: [DashboardService],
})
export class DashboardModule {}
