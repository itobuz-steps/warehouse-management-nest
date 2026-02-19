import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { USER_TYPES } from 'src/auth/userType';
import { User } from 'src/auth/entities/auth.entity';

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
}
