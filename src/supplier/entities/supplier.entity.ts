import { Prop, Schema } from '@nestjs/mongoose';
import { PRODUCT_CATEGORY_TYPES } from 'src/products/constants/product.constant';
import { SchemaFactory } from '@nestjs/mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop()
  phoneNumber: string;

  @Prop({
    required: true,
    enum: Object.values(PRODUCT_CATEGORY_TYPES),
    type: [String],
  })
  suppliedProduct: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
