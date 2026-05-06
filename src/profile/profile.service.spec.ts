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
});
