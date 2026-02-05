import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/auth/entities/auth.entity';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import configService from 'src/config/config.service';

type TokenPayload = JwtPayload & {
  id: string;
};

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: User;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { path, headers } = request;

    if (path.includes('qr')) {
      return true;
    }

    const authHeader = headers.authorization;
    if (!authHeader) {
      throw new BadRequestException('No Token Provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      const isRefresh = path.includes('refresh');
      const secret = isRefresh
        ? configService().REFRESH_SECRET_KEY
        : configService().ACCESS_SECRET_KEY;

      if (!secret) {
        throw new Error(
          `${isRefresh ? 'REFRESH' : 'ACCESS'}_SECRET_KEY is not defined`,
        );
      }

      const decoded = jwt.verify(token, secret) as TokenPayload;

      if (!decoded || typeof decoded.id !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.userModel
        .findOne({
          _id: decoded.id,
          isDeleted: false,
        })
        .select('-password');

      if (!user) {
        throw new NotFoundException('User not found!');
      }

      if (!user.isActive) {
        throw new ForbiddenException('User has been blocked!');
      }

      request.userId = decoded.id;
      request.user = user;

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      if (error instanceof Error) {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
