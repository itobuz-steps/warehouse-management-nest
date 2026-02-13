import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { USER_TYPES } from 'src/auth/userType';
import { User, UserDocument } from 'src/auth/entities/auth.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async getManagers() {
    const data = await this.userModel.find(
      {
        role: USER_TYPES.MANAGER,
        isVerified: true,
        isDeleted: false,
      },
      {
        password: 0,
        __v: 0,
      },
    );

    return {
      message: 'All Managers',
      success: true,
      data: data,
    };
  }

  isAdmin(user: UserDocument) {
    if (user.role === USER_TYPES.ADMIN) {
      return {
        message: 'User is a admin',
        success: true,
      };
    }

    return {
      message: 'User is not a admin',
      success: false,
    };
  }
}
