import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VariantDocument = Variant & Document;

@Schema({ timestamps: true })
export class Variant {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  attributes: Record<string, string>;

  @Prop([String])
  variantImage: string[];

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({
    required: false,
    min: 0,
    max: 100,
    default: 10,
  })
  markup: number;

  @Prop({ required: true, unique: true, immutable: true })
  sku: string;
}

export const VariantSchema = SchemaFactory.createForClass(Variant);
