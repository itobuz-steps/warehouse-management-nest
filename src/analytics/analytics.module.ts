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
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import {
  VariantStock,
  VariantStockSchema,
} from 'src/variant-stock/schemas/variant-stock.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: Quantity.name, schema: QuantitySchema },
      { name: User.name, schema: UserSchema },
      { name: VariantStock.name, schema: VariantStockSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ExcelService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
