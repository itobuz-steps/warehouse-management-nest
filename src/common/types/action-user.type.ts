import type { USER_TYPES } from 'src/auth/userType';

export interface ActionUser {
  userId: string; // stringified ObjectId (safe for logs)
  email: string;
  role: USER_TYPES;
}
