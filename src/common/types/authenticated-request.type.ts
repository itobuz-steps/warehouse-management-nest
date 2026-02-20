import type { Request } from 'express';
import type { User } from 'src/auth/entities/auth.entity';

export interface AuthenticatedRequest extends Request {
  userId: string;
  user: User;
}
