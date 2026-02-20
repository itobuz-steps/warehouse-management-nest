import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';

export type BatchDocument = Batch & Document;

@Schema({ timestamps: true })
export class Batch {
  @Prop({ required: true, enum: TRANSACTION_TYPES })
  transactionType: TRANSACTION_TYPES;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  sourceWarehouse?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  destinationWarehouse?: Types.ObjectId;

  @Prop({
    type: [
      {
        variant: { type: Types.ObjectId, ref: 'Variant', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    required: true,
  })
  items: {
    variant: Types.ObjectId;
    quantity: number;
  }[];
}

export const BatchSchema = SchemaFactory.createForClass(Batch);

BatchSchema.index({ createdAt: -1 });
