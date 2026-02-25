import { Module } from '@nestjs/common';
import { VariantService } from './variant.service';
import { VariantController } from './variant.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Variant, VariantSchema } from './schemas/variant.schema';
import { Product, ProductSchema } from 'src/products/entities/product.entity';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import { StorageService } from 'src/storage/storage.service';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Variant.name, schema: VariantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
    StorageModule,
  ],
  controllers: [VariantController],
  providers: [VariantService, StorageService],
  exports: [VariantService],
})
export class VariantModule {}
