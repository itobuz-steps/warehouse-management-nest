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
import { User } from 'src/auth/entities/auth.entity'; // Adjust path to your schema
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

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

    // 1. Bypass check (mimics: if (req.path.includes('qr')))
    if (path.includes('qr')) {
      return true;
    }

    // 2. Extract Authorization Header
    const authHeader = headers.authorization;
    if (!authHeader) {
      throw new BadRequestException('No Token Provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      // 3. Determine Secret (mimics your getSecret logic)
      const isRefresh = path.includes('refresh');
      const secret = isRefresh
        ? process.env.REFRESH_SECRET_KEY
        : process.env.ACCESS_SECRET_KEY;

      if (!secret) {
        throw new Error(
          `${isRefresh ? 'REFRESH' : 'ACCESS'}_SECRET_KEY is not defined`,
        );
      }

      // 4. Verify JWT
      const decoded = jwt.verify(token, secret) as TokenPayload;

      if (!decoded || typeof decoded.id !== 'string') {
        throw new UnauthorizedException('Invalid token payload');
      }

      // 5. Database validation (mimics: User.findOne({ _id: decoded.id, isDeleted: false }))
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

      // 6. Attach to request (mimics: req.userId = decoded.id; req.user = user;)
      request.userId = decoded.id;
      request.user = user;

      return true;
    } catch (error) {
      // Direct mimicry of your catch block
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
