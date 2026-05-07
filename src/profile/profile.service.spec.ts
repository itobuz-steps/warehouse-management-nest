jest.mock('src/auth/entities/auth.entity', () => ({ User: class User {} }));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: class TransactionLogsService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { Types } from 'mongoose';
import { USER_TYPES } from 'src/auth/userType';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';

describe('ProfileService', () => {
  const userModel = {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const storageService = {
    deleteFile: jest.fn(),
    uploadSingleFile: jest.fn(),
    getPresignedSignedUrl: jest.fn(),
  };
  const logsService = {
    createLog: jest.fn(),
  };
  const warehouseModel = {
    findById: jest.fn(),
  };

  let service: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService(
      userModel as any,
      storageService as any,
      logsService as any,
      warehouseModel as any,
    );
  });

  it('requires a file to update the profile image', async () => {
    await expect(
      service.updateProfile({} as any, undefined as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('uploads and saves a new profile image', async () => {
    const save = jest.fn();

    storageService.uploadSingleFile.mockResolvedValue({
      key: 'profile-key',
      url: 'https://cdn/profile.png',
    });

    const user = {
      save,
    } as any;

    await expect(service.updateProfile(user, {} as any)).resolves.toEqual({
      message: 'User profile updated successfully!',
      profileImage: 'https://cdn/profile.png',
    });

    expect(save).toHaveBeenCalled();
  });

  it('blocks managers from reading admin user details', async () => {
    await expect(
      service.getUserDetails({ role: 'manager' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('merges notification preferences onto the user', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const user = { preferences: { email: true, push: true }, save } as any;

    await expect(
      service.setUserNotificationPreference({ push: false } as any, user),
    ).resolves.toEqual({ email: true, push: false });
    expect(save).toHaveBeenCalled();
  });

  it('toggles manager status and creates a log entry', async () => {
    const existingManager = {
      _id: {
        toHexString: jest.fn().mockReturnValue('manager-id'),
      },
      name: 'Manager One',
      email: 'manager@example.com',
      isActive: true,
    };

    const updatedManager = {
      _id: {
        toHexString: jest.fn().mockReturnValue('manager-id'),
      },
      name: 'Manager One',
      email: 'manager@example.com',
      isActive: false,
    };

    userModel.findOne.mockResolvedValue(existingManager);

    userModel.findOneAndUpdate.mockResolvedValue(updatedManager);

    logsService.createLog.mockResolvedValue(undefined);

    await expect(
      service.changeStatus('507f1f77bcf86cd799439011', {
        _id: 'admin-1',
      } as any),
    ).resolves.toEqual({
      message: 'Manager Blocked Successfully',
    });

    expect(userModel.findOne).toHaveBeenCalledWith({
      _id: expect.any(Types.ObjectId),
      role: USER_TYPES.MANAGER,
      isVerified: true,
      isDeleted: false,
    });

    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: existingManager._id },
      [{ $set: { isActive: { $not: '$isActive' } } }],
      { new: true, updatePipeline: true },
    );

    expect(logsService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: LOG_ACTION.USER_BLOCKED,
        entityType: LOG_ENTITY_TYPE.USER,
        entityId: 'manager-id',
        metadata: {
          oldValue: {
            name: 'Manager One',
            email: 'manager@example.com',
            isActive: true,
          },
          newValue: {
            name: 'Manager One',
            email: 'manager@example.com',
            isActive: false,
          },
        },
      }),
    );
  });
});
