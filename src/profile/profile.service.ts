// src/modules/profile/profile.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../auth/entities/auth.entity';
import { USER_TYPES } from '../auth/userType';
import { Request } from 'express';

@Injectable()
export class ProfileService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async updateProfile(
    user: UserDocument,
    file: Express.Multer.File,
    req: Request,
  ) {
    if (!file) {
      throw new NotFoundException('Please select an image');
    }

    user.profileImage = `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}`;
    await user.save();

    return { message: 'User profile updated successfully!' };
  }

  getCurrentUser(user: User) {
    return { user };
  }

  async getUserDetails(user: User) {
    if (user.role === USER_TYPES.MANAGER) {
      throw new ForbiddenException(
        'Managers are not allowed to access this data',
      );
    }
    let verifiedManagers = [];
    let unverifiedManagers = [];

    verifiedManagers = await this.userModel.find({
      role: USER_TYPES.MANAGER,
      isVerified: true,
      isDeleted: false,
    });

    unverifiedManagers = await this.userModel.find({
      role: USER_TYPES.MANAGER,
      isVerified: false,
      isDeleted: false,
    });

    return { user, verifiedManagers, unverifiedManagers };
  }

  async deleteUser(user: UserDocument) {
    await this.userModel.findByIdAndUpdate(user._id, { isDeleted: true });
    return { message: 'User deleted successfully!' };
  }

  async changeStatus(managerId: string) {
    const manager = await this.userModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(managerId),
        role: USER_TYPES.MANAGER,
        isVerified: true,
        isDeleted: false,
      },
      [{ $set: { isActive: { $not: '$isActive' } } }],
      { new: true, updatePipeline: true },
    );

    if (!manager) {
      throw new NotFoundException('Manager does not exist');
    }

    return {
      message: manager.isActive
        ? 'Manager Unblocked Successfully'
        : 'Manager Blocked Successfully',
    };
  }
}
