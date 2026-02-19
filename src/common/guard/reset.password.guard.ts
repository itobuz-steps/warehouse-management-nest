import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import configService from 'src/config/config.service';

export type ResetPasswordTokenPayload = {
  email: string;
  purpose: 'password-reset';
  iat: number;
  exp: number;
};

export type ResetPasswordRequest = Request & {
  userEmail: string;
};

@Injectable()
export class ResetPasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ResetPasswordRequest>();

    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Missing reset token');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    let payload: ResetPasswordTokenPayload;

    try {
      payload = jwt.verify(
        token,
        configService().TOKEN_SECRET,
      ) as ResetPasswordTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Invalid reset token');
    }

    request.userEmail = payload.email;

    return true;
  }
}
