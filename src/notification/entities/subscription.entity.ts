import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop()
  endpoint: string;

  @Prop({ default: null })
  expirationTime?: Date;

  @Prop({ type: Object })
  keys: {
    p256dh: string;
    auth: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
