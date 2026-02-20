import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { USER_TYPES } from '../userType';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId })
  readonly _id!: Types.ObjectId;

  @Prop()
  name?: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password?: string;

  @Prop({ required: true, enum: Object.values(USER_TYPES) })
  role: USER_TYPES;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  profileImage?: string;

  @Prop()
  lastLogin?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
