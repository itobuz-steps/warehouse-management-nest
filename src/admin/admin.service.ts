import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { USER_TYPES } from 'src/auth/userType';
import { User } from 'src/auth/entities/auth.entity';
import { StorageService } from 'src/storage/storage.service';
import { GetManagersDto } from './dto/get-manager.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly storageService: StorageService,
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

  async getAllManagers(query: GetManagersDto) {
    const {
      page = '1',
      limit = '5',
      search,
      isActive,
      isVerified,
      sort = 'desc',
    } = query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const filters: QueryFilter<User> = {
      role: USER_TYPES.MANAGER,
    };

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      filters.isVerified = isVerified === 'true';
    }

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.userModel.countDocuments(filters);

    const users = await this.userModel
      .find(filters, { password: 0, __v: 0 })
      .sort({ createdAt: sort === 'asc' ? 1 : -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const data = await Promise.all(
      users.map(async (user) => {
        if (user.profileImageKey) {
          const url = await this.storageService.getPresignedSignedUrl(
            user.profileImageKey,
          );
          return { ...user.toObject(), profileImage: url };
        }
        return user.toObject();
      }),
    );

    return {
      message: 'Managers fetched successfully',
      success: true,
      data,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };
  }
}
