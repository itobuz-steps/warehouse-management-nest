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
    aggregate: jest.fn(),
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

  it('returns paginated managers with metadata', async () => {
    userModel.countDocuments.mockResolvedValue(1);

    const sortMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockResolvedValue([
      {
        toObject: () => ({
          _id: 'manager-1',
          name: 'Manager',
        }),
      },
    ]);

    userModel.find.mockReturnValue({
      sort: sortMock,
      skip: skipMock,
      limit: limitMock,
    });

    const result = await service.getAllManagers({
      page: '1',
      limit: '5',
    } as any);

    expect(result).toEqual({
      message: 'Managers fetched successfully',
      success: true,
      data: [
        {
          _id: 'manager-1',
          name: 'Manager',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 5,
        totalPages: 1,
      },
    });
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

  it('adds profile image urls when profileImageKey exists', async () => {
    userModel.countDocuments.mockResolvedValue(1);

    storageService.getPresignedSignedUrl.mockResolvedValue(
      'https://signed-url',
    );

    userModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          profileImageKey: 'image-key',
          toObject: () => ({
            _id: 'manager-1',
            profileImageKey: 'image-key',
          }),
        },
      ]),
    });

    const result = await service.getAllManagers({} as any);

    expect(storageService.getPresignedSignedUrl).toHaveBeenCalledWith(
      'image-key',
    );

    expect(result.data[0]).toEqual({
      _id: 'manager-1',
      profileImageKey: 'image-key',
      profileImage: 'https://signed-url',
    });
  });

  it('returns analytics for a specific manager', async () => {
    jest.spyOn(service as any, 'getStatForManager').mockResolvedValue({
      total: 10,
    });

    const result = await service.getManagerTransactionStats('manager-1');

    expect(result).toEqual({
      success: true,
      message: 'Manager analytics retrieved successfully',
      data: {
        managerStat: {
          total: 10,
        },
      },
    });
  });

  it('returns most efficient manager analytics when managerId is not provided', async () => {
    jest.spyOn(service as any, 'getMostEfficientManager').mockResolvedValue({
      total: 20,
    });

    const result = await service.getManagerTransactionStats();

    expect(result).toEqual({
      success: true,
      message: 'Manager analytics retrieved successfully',
      data: {
        managerStat: {
          total: 20,
        },
      },
    });
  });

  it('returns 7 day manager trend data', async () => {
    userModel.aggregate.mockResolvedValue([]);

    const result = await service.getManagerAddedTrend(7);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Manager trend retrieved');
    expect(result.data).toHaveLength(7);
  });

  it('returns 30 day manager trend data', async () => {
    userModel.aggregate.mockResolvedValue([]);

    const result = await service.getManagerAddedTrend(30);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Manager trend retrieved');
    expect(result.data).toHaveLength(4);
  });
});
