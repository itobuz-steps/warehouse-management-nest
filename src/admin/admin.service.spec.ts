jest.mock('src/auth/entities/auth.entity', () => ({ User: class User {} }));
jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
}));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));

import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const userModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };
  const transactionModel = {};
  const warehouseModel = {
    findById: jest.fn(),
  };
  const storageService = {
    getPresignedSignedUrl: jest.fn(),
  };

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(
      userModel as any,
      transactionModel as any,
      warehouseModel as any,
      storageService as any,
    );
  });

  it('returns all verified, non-deleted managers', async () => {
    userModel.find.mockResolvedValue([{ email: 'manager@example.com' }]);

    await expect(service.getManagers()).resolves.toEqual({
      message: 'All Managers',
      success: true,
      data: [{ email: 'manager@example.com' }],
    });
    expect(userModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'manager',
        isVerified: true,
        isDeleted: false,
      }),
      { password: 0, __v: 0 },
    );
  });

  it('throws when a filtered warehouse does not exist', async () => {
    warehouseModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(service.getManagers('warehouse-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns empty paginated data when a warehouse has no managers', async () => {
    warehouseModel.findById.mockResolvedValue({ managerIds: [] });

    await expect(
      service.getAllManagers({ warehouseId: 'warehouse-1' } as any),
    ).resolves.toEqual({
      success: true,
      message: 'Manager trend retrieved',
      data: [],
    });
  });
});
