import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const invalidPasswordMessage: string =
  'Password must contain uppercase, lowercase, number, and special character';

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

  @Matches(PASSWORD_REGEX, {
    message: invalidPasswordMessage,
  })
  password: string;
}

export class SetPasswordDto {
  @IsNotEmpty()
  name: string;

  @Matches(PASSWORD_REGEX, {
    message: invalidPasswordMessage,
  })
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

  @Matches(PASSWORD_REGEX, {
    message: invalidPasswordMessage,
  })
  password: string;
}
