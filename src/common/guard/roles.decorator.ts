import { applyDecorators, UseGuards } from '@nestjs/common';
import { USER_TYPES } from 'src/auth/userType';
import { RolesGuard } from './roles.guard';

export const Roles = (...roles: USER_TYPES[]) =>
  applyDecorators(UseGuards(new RolesGuard(roles)));
