import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  TransactionBatch,
  TransactionBatchItemSchema,
} from './transaction-batch.schema';

@Schema({ _id: false })
export class TransactionVariant {
  @Prop({ type: Types.ObjectId, ref: 'Variant', required: true })
  variant: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ type: [TransactionBatchItemSchema], default: [] })
  batches: TransactionBatch[];
}

export const TransactionVariantSchema =
  SchemaFactory.createForClass(TransactionVariant);
