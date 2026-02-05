import * as jwt from 'jsonwebtoken';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AuthTokens = {
  access?: string;
  refresh?: string;
};

@Injectable()
export default class TokenGenerator {
  constructor(private readonly config: ConfigService) {}

  invitationToken(email: string): string {
    const token_secret = this.config.get<string>('TOKEN_SECRET', 'secret_key');

    const invitation = jwt.sign({ email: email }, token_secret, {
      expiresIn: this.config.get<string>('TOKEN_EXPIRE') as unknown as number,
    });

    return invitation;
  }

  generateToken(id: string): AuthTokens {
    const access = this.config.get<string>('ACCESS_SECRET_KEY');
    const refresh = this.config.get<string>('REFRESH_SECRET_KEY');
    const accessExpiry = this.config.get<string>(
      'ACCESS_TOKEN_EXPIRY'
    ) as unknown as number;
    const refreshExpiry = this.config.get<string>(
      'REFRESH_TOKEN_EXPIRY'
    ) as unknown as number;

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
