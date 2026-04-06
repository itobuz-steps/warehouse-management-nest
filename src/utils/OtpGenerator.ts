import { Injectable } from '@nestjs/common';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';

import { OTP, OTPDocument } from '../auth/entities/otp.entity.js';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export default class OtpGenerator {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(OTP.name) private readonly otpModel: Model<OTPDocument>,
    private readonly sendEmail: MailService,
  ) {}

  generateOtp = async (email: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    let otpDoc = await this.otpModel.findOne({ email });

    if (!otpDoc) {
      otpDoc = new this.otpModel({ email, otp: [otp] });
    } else {
      otpDoc.otp.push(otp);
    }
    await otpDoc.save();

    const response = await this.sendEmail.sendOtpEmail(email, otp);
    return response;
  };
}
