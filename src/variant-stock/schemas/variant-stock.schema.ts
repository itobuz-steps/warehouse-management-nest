import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VariantStockDocument = HydratedDocument<VariantStock>;

@Schema({ timestamps: true })
export class VariantStock {
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Variant',
    required: true,
  })
  variantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  })
  warehouseId: Types.ObjectId;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  quantity: number;
}

export const VariantStockSchema = SchemaFactory.createForClass(VariantStock);

VariantStockSchema.index(
  { variantId: 1, warehouseId: 1, productId: 1 },
  { unique: true },
);

VariantStockSchema.index({ warehouseId: 1 });
VariantStockSchema.index({ variantId: 1 });
