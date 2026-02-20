import { Module } from '@nestjs/common';
import { VariantService } from './variant.service';
import { VariantController } from './variant.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Variant, VariantSchema } from './schemas/variant.schema';
import { Product, ProductSchema } from 'src/products/entities/product.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Variant.name, schema: VariantSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [VariantController],
  providers: [VariantService],
})
export class VariantModule {}
