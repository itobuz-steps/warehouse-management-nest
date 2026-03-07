import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MongooseModule } from '@nestjs/mongoose';

import { Product, ProductSchema } from './entities/product.entity';
import { User, UserSchema } from '../auth/entities/auth.entity';
import { Variant, VariantSchema } from 'src/variant/schemas/variant.schema';
import { VariantModule } from 'src/variant/variant.module';
import { TransactionLogsModule } from 'src/transaction-logs/transaction-logs.module';
import { StorageModule } from 'src/storage/storage.module';
import {
  VariantStock,
  VariantStockSchema,
} from 'src/variant-stock/schemas/variant-stock.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Variant.name, schema: VariantSchema },
      { name: VariantStock.name, schema: VariantStockSchema },
    ]),
    VariantModule,
    TransactionLogsModule,
    StorageModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
