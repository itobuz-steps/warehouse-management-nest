import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { USER_TYPES } from '../userType';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
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

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  profileImageKey: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
