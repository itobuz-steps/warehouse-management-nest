import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OTPDocument = OTP & Document;

@Schema({ timestamps: true })
export class OTP {
  @Prop({ required: true })
  email: string;

  @Prop({ type: [String], default: [] })
  otp: string[];
}

export const OTPSchema = SchemaFactory.createForClass(OTP);
