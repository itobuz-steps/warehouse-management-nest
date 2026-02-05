import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { User, UserSchema } from './entities/auth.entity';
import { OTP, OTPSchema } from './entities/otp.entity';
import TokenGenerator from 'src/utils/TokenGenerator';
import OtpGenerator from 'src/utils/OtpGenerator';

// @Module({
//   imports: [
//     MongooseModule.forFeature([
//       { name: User.name, schema: UserSchema },
//       { name: OTP.name, schema: OTPSchema },
//     ]),
//   ],
//   controllers: [AuthController],
//   providers: [AuthService, TokenGenerator, OtpGenerator],
// })
// export class AuthModule {}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OTP.name, schema: OTPSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenGenerator, OtpGenerator],
  exports: [OtpGenerator, TokenGenerator], // Optional if needed elsewhere
})
export class AuthModule {}
