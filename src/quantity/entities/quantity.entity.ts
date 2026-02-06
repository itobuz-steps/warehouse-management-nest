import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Quantity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  quantity: number;

  @Prop({ required: true, default: 10 })
  limit: number;
}

export const QuantitySchema = SchemaFactory.createForClass(Quantity);
