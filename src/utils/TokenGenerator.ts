import * as jwt from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AuthTokens = {
  access?: string;
  refresh?: string;
};

@Injectable()
export class TokenGenerator {
  constructor(private readonly config: ConfigService) {}

  invitationToken(email: string): string {
    const token_secret = this.config.get<string>('TOKEN_SECRET', 'secret_key');

    const invitation = jwt.sign({ email: email }, token_secret, {
      expiresIn: this.config.get<`${number}ms`>('TOKEN_EXPIRE'),
    });

    return invitation;
  }

  resetPasswordToken(email: string): string {
    const token_secret = this.config.get<string>('TOKEN_SECRET', 'secret_key');

    const resetToken = jwt.sign(
      { email: email, purpose: 'password-reset' },
      token_secret,
      {
        expiresIn: this.config.get<`${number}ms`>('TOKEN_EXPIRE'),
      },
    );

    return resetToken;
  }

  generateToken(id: string): AuthTokens {
    const access = this.config.get<string>('ACCESS_SECRET_KEY');
    const refresh = this.config.get<string>('REFRESH_SECRET_KEY');
    const accessExpiry = this.config.get<`${number}ms`>('ACCESS_TOKEN_EXPIRY');
    const refreshExpiry = this.config.get<`${number}ms`>(
      'REFRESH_TOKEN_EXPIRY',
    );

    if (!access || !refresh || !accessExpiry || !refreshExpiry) {
      throw new Error('JWT secrets are not properly configured');
    }

    const accessToken: string = jwt.sign({ id }, access, {
      expiresIn: accessExpiry,
    });

    const refreshToken: string = jwt.sign({ id }, refresh, {
      expiresIn: refreshExpiry,
    });

    return {
      access: accessToken,
      refresh: refreshToken,
    };
  }
}
