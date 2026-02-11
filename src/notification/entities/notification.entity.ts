import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NOTIFICATION_TYPES } from '../notificationTypes';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  userIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  transactionPerformedBy: Types.ObjectId;

  @Prop({ enum: Object.values(NOTIFICATION_TYPES) })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  seen: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  relatedProduct?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  warehouse?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Transaction' })
  transactionId?: Types.ObjectId;

  @Prop({ default: false })
  isShipped: boolean;

  @Prop({ default: false })
  isCancelled: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reportedBy?: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
