import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  VariantStock,
  VariantStockSchema,
} from './schemas/variant-stock.schema';
import { VariantStockService } from './variant-stock.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VariantStock.name, schema: VariantStockSchema },
    ]),
  ],
  providers: [VariantStockService],
  exports: [VariantStockService, VariantStockModule],
})
export class VariantStockModule {}
