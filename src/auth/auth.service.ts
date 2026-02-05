import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import { User, UserDocument } from './entities/auth.entity.js';
import { OTP, OTPDocument } from './entities/otp.entity.js';

import {
  SignupDto,
  LoginDto,
  SetPasswordDto,
  SendOtpDto,
  ForgotPasswordDto,
} from './dto/create-auth.dto.js';

import config from '../config/config.service';
import TokenGenerator from '../utils/TokenGenerator.js';
import SendEmail from '../utils/SendEmail.js';
import OtpGenerator from '../utils/OtpGenerator.js';

export interface TokenPayload {
  email?: string;
  id?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(OTP.name) private readonly otpModel: Model<OTPDocument>,
    private readonly tokenGenerator: TokenGenerator,
    private readonly otpGenerator: OtpGenerator
  ) {}

  async signup(dto: SignupDto) {
    const { email, role } = dto;

    const isUser = await this.userModel.findOne({ email }).exec();

    if (isUser?.isVerified) {
      throw new BadRequestException('User already exists');
    }
    if (!isUser) {
      await this.userModel.create({ email, role });
    }

    const inviteToken = this.tokenGenerator.invitationToken(email);

    const link = `http://${config().FRONTEND_URL}/signup?token=${inviteToken}`;

    const response = new SendEmail().sendInvitationEmail(email, link);
    console.log(response);

    return {
      message: 'Invitation link sent successfully',
      success: true,
    };
  }

  verify(token: string) {
    const tokenData = jwt.verify(token, config().TOKEN_SECRET) as TokenPayload;

    return { message: 'Valid Token', success: true, data: tokenData };
  }

  async setPassword(token: string, dto: SetPasswordDto) {
    const payload = jwt.verify(
      token,
      process.env.TOKEN_SECRET as string
    ) as TokenPayload;

    if (!payload.email) {
      throw new UnauthorizedException('Invalid token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userModel.findOneAndUpdate(
      { email: payload.email, isVerified: false },
      {
        name: dto.name,
        password: hashedPassword,
        isVerified: true,
      },
      { new: true }
    );

    if (!user) {
      throw new BadRequestException('User already verified');
    }

    return { message: 'Registration successful', success: true };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.userModel.findOneAndUpdate(
      { email, isDeleted: false, isActive: true },
      { lastLogin: new Date() },
      { new: true }
    );

    if (!user || !user.password) {
      throw new UnauthorizedException("User doesn't exist or blocked");
    }

    const passwordMatch: boolean = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = this.tokenGenerator.generateToken(user._id.toString());

    console.log(token);

    const accessToken = token.access;
    const refreshToken = token.refresh;

    return {
      message: 'Login Successful',
      success: true,
      data: {
        accessToken,
        refreshToken,
      },
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const { email } = dto;

    const user = await this.userModel.findOne({ email }).exec();

    if (!user) {
      throw new BadRequestException('User does not exist');
    }

    const response = this.otpGenerator.generateOtp(email);
    console.log(response);

    return {
      message: 'OTP sent successfully, check your email',
      success: true,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email, otp, password } = dto;

    const otpDoc = await this.otpModel.findOne({ email }).exec();

    if (!otpDoc || otpDoc.otp.at(-1) !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const hashedPassword: string = await bcrypt.hash(password, 10);

    await this.userModel.updateOne({ email }, { password: hashedPassword });

    return { message: 'Password reset successful', success: true };
  }

  refresh(userId: string) {
    const token = this.tokenGenerator.generateToken(userId);

    return {
      message: 'Valid Access and Refresh Token',
      success: true,
      data: {
        accessToken: token.access,
        refreshToken: token.refresh,
      },
    };
  }
}
