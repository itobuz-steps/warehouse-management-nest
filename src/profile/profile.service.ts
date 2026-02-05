// src/modules/profile/profile.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../auth/entities/auth.entity';
import { USER_TYPES } from '../auth/userType';

@Injectable()
export class ProfileService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async updateProfile(user, file) {
    if (!file) {
      throw new BadRequestException('Please select an image');
    }

    user.profileImage = `${process.env.BASE_URL}/uploads/user/${file.filename}`;
    await user.save();

    return { message: 'User profile updated successfully!' };
  }

  async getCurrentUser(user) {
    return { user };
  }

  async getUserDetails(user: User) {
    let verifiedManagers = [];
    let unverifiedManagers = [];

    if (user.role === USER_TYPES.ADMIN) {
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
    }

    return { user, verifiedManagers, unverifiedManagers };
  }

  async deleteUser(user: User) {
    await this.userModel.findByIdAndUpdate(user._id, { isDeleted: true });
    return { message: 'User deleted successfully!' };
  }

  async changeStatus(managerId: string) {
    const manager = await this.userModel.findOneAndUpdate(
      {
        _id: managerId,
        role: USER_TYPES.MANAGER,
        isVerified: true,
        isDeleted: false,
      },
      [{ $set: { isActive: { $not: '$isActive' } } }],
      { new: true },
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
