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
  attributes: Map<string, string>;
  // Example:
  // {
  //   color: "Blue",
  //   size: "XL",
  //   weight: "1L"
  // }

  @Prop({ required: true, unique: true, immutable: true })
  sku: string;
}

export const VariantSchema = SchemaFactory.createForClass(Variant);
