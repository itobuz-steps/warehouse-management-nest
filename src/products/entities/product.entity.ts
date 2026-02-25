import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { PRODUCT_CATEGORY_TYPES } from '../constants/product.constant';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    enum: Object.values(PRODUCT_CATEGORY_TYPES),
  })
  category: string;

  @Prop({ required: true, uppercase: true, trim: true })
  brand: string;

  @Prop({ required: true, uppercase: true, trim: true })
  label: string;

  @Prop()
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: Number, default: 0 })
  variantCount: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
