import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  TransactionVariant,
  TransactionVariantSchema,
} from './transaction-variant.schema';

@Schema({ _id: false })
export class TransactionProduct {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: [TransactionVariantSchema], required: true })
  variants: TransactionVariant[];
}

export const TransactionProductSchema =
  SchemaFactory.createForClass(TransactionProduct);
