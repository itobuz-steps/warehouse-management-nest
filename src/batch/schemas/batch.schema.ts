import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';

export type BatchDocument = Batch & Document;

@Schema({ timestamps: true })
export class Batch {
  @Prop({ required: true, unique: true })
  batchNo: string;

  @Prop({ required: true, enum: TRANSACTION_TYPES })
  transactionType: TRANSACTION_TYPES;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: false })
  sourceWarehouse?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: false })
  destinationWarehouse?: Types.ObjectId;

  @Prop({
    type: [
      {
        product: { type: Types.ObjectId, ref: 'Product', required: true },
        variant: { type: Types.ObjectId, ref: 'Variant', required: true },
        sku: { type: String, default: '' }, // leave blank for now
        quantity: { type: Number, required: true },
      },
    ],
    required: true,
  })
  items: {
    product: Types.ObjectId;
    variant: Types.ObjectId;
    sku: string;
    quantity: number;
  }[];
}

export const BatchSchema = SchemaFactory.createForClass(Batch);
