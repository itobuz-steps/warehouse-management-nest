// src/common/adapters/action-user.adapter.ts
import type { User } from 'src/auth/entities/auth.entity';
import type { ActionUser } from '../types/action-user.type';

export function toActionUser(user: User): ActionUser {
  return {
    userId: user._id.toHexString(),
    email: user.email,
    role: user.role,
  };
}
