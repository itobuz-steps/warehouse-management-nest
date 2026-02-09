import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import configService from 'src/config/config.service';

@Schema({ timestamps: true })
export class Quantity extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Warehouse', required: true })
  warehouseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  quantity: number = Number(configService().DEFAULT_QUANTITY);

  // @Prop({ required: true })
  limit?: number = Number(configService().LIMIT);
}

export const QuantitySchema = SchemaFactory.createForClass(Quantity);
