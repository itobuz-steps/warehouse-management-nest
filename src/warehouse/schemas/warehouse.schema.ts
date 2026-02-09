import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WarehouseDocument = HydratedDocument<Warehouse>;

@Schema({ timestamps: true })
export class Warehouse {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  description?: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
  })
  managerIds: Types.ObjectId[];

  @Prop({ default: true })
  active: boolean;

  @Prop({ required: true, default: 10000 })
  capacity: number;
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);
