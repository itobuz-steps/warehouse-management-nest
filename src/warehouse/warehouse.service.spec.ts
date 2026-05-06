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
  const transactionModel = {};
  const notificationModel = {};
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

  it('rejects warehouse access for unsupported roles', async () => {
    await expect(
      service.getWarehouses({ role: 'guest' } as any),
    ).rejects.toThrow(ForbiddenException);
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
});
