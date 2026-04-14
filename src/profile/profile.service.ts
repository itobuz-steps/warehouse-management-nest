import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../auth/entities/auth.entity';
import { USER_TYPES } from '../auth/userType';
import { StorageService } from 'src/storage/storage.service';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly storageService: StorageService,
    private readonly logsService: TransactionLogsService,
  ) {}

  async updateProfile(user: UserDocument, file: Express.Multer.File) {
    if (!file) {
      throw new NotFoundException('Please select an image');
    }

    if (user.profileImageKey) {
      try {
        await this.storageService.deleteFile(user.profileImageKey);
      } catch (err) {
        console.warn('Failed to delete old profile image', err);
      }
    }

    const uploadResult = await this.storageService.uploadSingleFile(file);

    user.profileImageKey = uploadResult.key;
    await user.save();

    return {
      message: 'User profile updated successfully!',
      profileImage: uploadResult.url,
    };
  }

  async getCurrentUser(user: UserDocument) {
    try {
      const userObject = user.toObject();

      let profileImageUrl: string | null = null;

      if (user.profileImageKey) {
        profileImageUrl = await this.storageService.getPresignedSignedUrl(
          user.profileImageKey,
        );
      }

      return {
        ...userObject,
        profileImage: profileImageUrl,
      };
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return user.toObject();
    }
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
      ? LOG_ACTION.USER_UNBLOCKED
      : LOG_ACTION.USER_BLOCKED;

    await this.logsService.createLog({
      action,
      entityType: LOG_ENTITY_TYPE.USER,
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

  async setUserNotificationPreference(
    preference: UpdatePreferenceDto,
    user: UserDocument,
  ) {
    user.preferences = {
      ...user.preferences,
      ...preference,
    };

    await user.save();
    return user.preferences;
  }

  async getUsers() {
    const users = await this.userModel
      .find({ isVerified: true }, { name: 1, email: 1, role: 1, _id: 1 })
      .lean();

    return users;
  }
}
