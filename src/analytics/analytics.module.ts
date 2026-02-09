import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
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
import { MongooseModule } from '@nestjs/mongoose';
import { ExcelService } from 'src/helper/excelGenerator';

@Module({
  imports: [
    // This connects your schemas to this specific module
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Quantity.name, schema: QuantitySchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ExcelService],
})
export class AnalyticsModule {}
