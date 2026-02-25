import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class TransactionVariant {
  @Prop({ type: Types.ObjectId, ref: 'Variant', required: true })
  variant: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export const TransactionVariantSchema =
  SchemaFactory.createForClass(TransactionVariant);
