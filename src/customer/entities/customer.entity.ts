import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  name?: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  address?: string;

  @Prop({ minLength: 10 })
  phoneNumber?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
