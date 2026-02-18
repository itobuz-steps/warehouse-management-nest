import { Controller, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

import {
  SignupDto,
  LoginDto,
  SetPasswordDto,
  SendOtpDto,
  ForgotPasswordDto,
} from './dto/create-auth.dto';
import type { RequestWithUser } from 'src/warehouse/types/userType';
import { AuthGuard } from 'src/common/guard/auth.guard';

@Controller('user/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('signup/:token')
  verify(@Param('token') token: string) {
    return this.authService.verify(token);
  }

  @Post('signup/set-password/:token')
  setPassword(@Param('token') token: string, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(token, dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @UseGuards(AuthGuard)
  @Post('refresh')
  refresh(@Req() req: RequestWithUser) {
    return this.authService.refresh(req.user._id);
  }
}
