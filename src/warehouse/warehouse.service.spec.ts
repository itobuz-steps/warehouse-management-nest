jest.mock('./schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/quantity/entities/quantity.entity', () => ({
  Quantity: class Quantity {},
}));
jest.mock('src/auth/entities/auth.entity', () => ({ User: class User {} }));
jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
}));
jest.mock('src/notification/entities/notification.entity', () => ({
  Notification: class Notification {},
}));
jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: class TransactionLogsService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { USER_TYPES } from 'src/auth/userType';

describe('WarehouseService', () => {
  const warehouseModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const quantityModel = {
    aggregate: jest.fn(),
  };
  const userModel = {
    find: jest.fn(),
  };
  const transactionModel = { aggregate: jest.fn() };
  const notificationModel = { aggregate: jest.fn() };
  const logService = {
    createLog: jest.fn(),
  };
  const storageService = {
    getPresignedSignedUrl: jest.fn(),
  };

  let service: WarehouseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WarehouseService(
      warehouseModel as any,
      quantityModel as any,
      userModel as any,
      transactionModel as any,
      notificationModel as any,
      logService as any,
      storageService as any,
    );
  });

  it('returns assigned warehouses for manager', async () => {
    warehouseModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.getWarehouses({
      role: USER_TYPES.MANAGER,
      _id: 'manager-1',
    } as any);

    expect(result).toEqual({
      success: true,
      message: 'Assigned Warehouses',
      data: [],
    });
  });

  it('returns all warehouses for admin', async () => {
    warehouseModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.getWarehouses({
      role: USER_TYPES.ADMIN,
    } as any);

    expect(result.message).toBe('All Warehouses');
  });

  it('rejects warehouse access for unsupported roles', async () => {
    await expect(
      service.getWarehouses({ role: 'guest' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws when manager tries accessing unassigned warehouse', async () => {
    warehouseModel.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.getWarehouseById('warehouse-1', {
        role: USER_TYPES.MANAGER,
        _id: 'manager-1',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws when warehouse capacity is requested for a missing warehouse', async () => {
    warehouseModel.findById.mockResolvedValue(null);

    await expect(
      service.getWarehouseCapacity('warehouse-1', { role: 'admin' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a warehouse and returns a success response', async () => {
    userModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([{ _id: 'manager-1', name: 'Manager' }]),
      }),
    });
    warehouseModel.create.mockResolvedValue({
      _id: { toHexString: () => 'warehouse-1' },
      name: 'Main Warehouse',
      address: 'Address',
      capacity: 100,
      active: true,
      maxTransactionPriceLimit: 5000,
      warehouseImageKey: null,
    });
    logService.createLog.mockResolvedValue(undefined);

    await expect(
      service.addWarehouse(
        {
          name: 'Main Warehouse',
          managers: ['507f1f77bcf86cd799439011'],
        } as any,
        null,
        { _id: 'user-1' } as any,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        message: 'Warehouses Created Successfully',
      }),
    );
  });

  it('soft deletes warehouse', async () => {
    warehouseModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'warehouse-1',
        name: 'Warehouse',
        active: true,
        address: 'Address',
        maxTransactionPriceLimit: 1000,
        warehouseImageKey: null,
      }),
    });

    warehouseModel.findByIdAndUpdate.mockResolvedValue({});

    logService.createLog.mockResolvedValue(undefined);

    await expect(
      service.deleteWarehouse('warehouse-1', { _id: 'user-1' } as any),
    ).resolves.toEqual({
      success: true,
      message: 'Warehouse Deleted Successfully',
    });

    expect(warehouseModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'warehouse-1',
      { active: false },
      { new: true },
    );
  });

  it('rejects unsupported role for capacity comparison', async () => {
    await expect(
      service.getWarehouseCapacityComparison({
        role: 'guest',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns warehouse capacity comparison', async () => {
    warehouseModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: 'warehouse-1' }]),
    });

    quantityModel.aggregate.mockResolvedValue([
      {
        warehouseId: 'warehouse-1',
        warehouseName: 'Main',
        capacity: 100,
        used: 50,
      },
    ]);

    const result = await service.getWarehouseCapacityComparison({
      role: USER_TYPES.ADMIN,
    } as any);

    expect(result[0].percentage).toBe(50);
  });

  it('rejects unsupported role for health comparison', async () => {
    await expect(
      service.getWarehouseHealthComparison({}, { role: 'guest' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('returns warehouse health comparison', async () => {
    warehouseModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: 'warehouse-1' }]),
    });

    transactionModel.aggregate.mockResolvedValue([
      {
        _id: 'warehouse-1',
        total: 10,
        cancelled: 1,
        returned: 1,
        rejected: 1,
        adjustments: 1,
        warehouse: {
          name: 'Main',
        },
      },
    ]);

    notificationModel.aggregate.mockResolvedValue([
      {
        _id: 'warehouse-1',
        count: 1,
      },
    ]);

    const result = await service.getWarehouseHealthComparison({}, {
      role: USER_TYPES.ADMIN,
    } as any);

    expect(result[0].warehouseName).toBe('Main');
  });
});
