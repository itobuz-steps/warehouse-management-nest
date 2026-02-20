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
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LogAction } from 'src/transaction-logs/enums/log-action.enum';
import { LogEntityType } from 'src/transaction-logs/enums/log-entity-type.enum';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly logsService: TransactionLogsService,
  ) {}

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

  async changeStatus(managerId: string, user: UserDocument) {
    const existingManager = await this.userModel.findOne({
      _id: new Types.ObjectId(managerId),
      role: USER_TYPES.MANAGER,
      isVerified: true,
      isDeleted: false,
    });

    if (!existingManager) {
      throw new NotFoundException('Manager does not exist');
    }

    const oldValue = {
      name: existingManager.name as string,
      email: existingManager.email,
      isActive: existingManager.isActive,
    };

    const updatedManager = await this.userModel.findOneAndUpdate(
      { _id: existingManager._id },
      [{ $set: { isActive: { $not: '$isActive' } } }],
      { new: true, updatePipeline: true },
    );

    if (!updatedManager) {
      throw new NotFoundException('Manager update failed');
    }

    const newValue = {
      name: updatedManager.name as string,
      email: updatedManager.email,
      isActive: updatedManager.isActive,
    };

    const action = updatedManager.isActive
      ? LogAction.USER_UNBLOCKED
      : LogAction.USER_BLOCKED;

    await this.logsService.createLog({
      action,
      entityType: LogEntityType.USER,
      entityId: updatedManager._id.toHexString(),
      performedBy: user,
      metadata: {
        oldValue,
        newValue,
      },
    });

    return {
      message: updatedManager.isActive
        ? 'Manager Unblocked Successfully'
        : 'Manager Blocked Successfully',
    };
  }
}
