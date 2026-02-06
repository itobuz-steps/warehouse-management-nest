import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { USER_TYPES } from 'src/auth/userType';
import type { RequestWithUser } from 'src/warehouse/types/userType';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly allowedRoles: USER_TYPES[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !this.allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
