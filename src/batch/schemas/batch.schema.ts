import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BatchDocument = Batch & Document;

@Schema({ timestamps: true })
export class Batch {
  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  sourceWarehouse?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  destinationWarehouse?: Types.ObjectId;

  @Prop({
    type: [
      {
        variant: { type: Types.ObjectId, ref: 'Variant', required: true },
        quantity: { type: Number, required: true, min: 1 },
        remainingQuantity: { type: Number, required: true, min: 0 },
        damagedQuantity: { type: Number, required: true, min: 0, default: 0 },
      },
    ],
    required: true,
  })
  items: {
    variant: Types.ObjectId;
    quantity: number;
    remainingQuantity: number;
    damagedQuantity: number;
  }[];
}

export const BatchSchema = SchemaFactory.createForClass(Batch);

BatchSchema.index({
  destinationWarehouse: 1,
  'items.variant': 1,
  createdAt: 1,
});
BatchSchema.index({ destinationWarehouse: 1 });
