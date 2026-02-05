import { USER_TYPES } from 'src/auth/userType';

type User = {
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
export default User;
