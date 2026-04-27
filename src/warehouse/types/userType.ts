import type { Request } from 'express';
import { Types } from 'mongoose';
import { USER_TYPES } from 'src/auth/userType';

export type User = {
  _id: string;
  email: string;
  role: USER_TYPES;
  isVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password?: string | null;
  profileImage?: string | null;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  warehouseId?: string | null;
};

export type PopulatedManager = {
  _id: string;
  name: string;
  email: string;
  role: string;
  profileImageKey?: string;
  profileImage?: string;
};

export type RequestWithUser = Request & {
  user: User;
};

export default User;

export type CapacityAggResult = {
  warehouseId: Types.ObjectId;
  warehouseName: string;
  capacity: number;
  used: number;
};

export type HealthAggResult = {
  _id: Types.ObjectId;
  total: number;
  cancelled: number;
  returned: number;
  rejected: number;
  adjustments: number;
  lowStock: number;
  warehouse: {
    name: string;
  };
};
