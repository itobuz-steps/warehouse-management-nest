import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class TransactionBatch {
  @Prop({ type: Types.ObjectId, ref: 'Batch', required: true })
  batch: Types.ObjectId;

  @Prop({ required: true })
  quantity: number;
}

export const TransactionBatchItemSchema =
  SchemaFactory.createForClass(TransactionBatch);
