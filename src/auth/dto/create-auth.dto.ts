import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Base DTO required by UpdateAuthDto
export class CreateAuthDto {
  @IsEmail()
  email: string;
}

export class SignupDto extends CreateAuthDto {
  @IsNotEmpty()
  role: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}

export class SetPasswordDto {
  @IsNotEmpty()
  name: string;

  @MinLength(6)
  password: string;
}

export class SendOtpDto {
  @IsEmail()
  email: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  otp: string;

  @MinLength(6)
  password: string;
}
