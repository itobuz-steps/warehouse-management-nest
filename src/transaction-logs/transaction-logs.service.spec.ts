jest.mock('./entities/transaction-log.entity', () => ({
  TransactionLog: class TransactionLog {},
}));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));

import { TransactionLogsService } from './transaction-logs.service';

describe('TransactionLogsService', () => {
  const logModel = {
    create: jest.fn(),
    find: jest.fn(),
  };
  const warehouseModel = {
    find: jest.fn(),
  };
  const storageService = {
    getPresignedSignedUrl: jest.fn(),
  };

  let service: TransactionLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionLogsService(
      logModel as any,
      warehouseModel as any,
      storageService as any,
    );
  });

  it('creates logs with the performed by user id', async () => {
    logModel.create.mockResolvedValue(undefined);

    await service.createLog({
      action: 'PRODUCT_CREATED' as any,
      entityType: 'PRODUCT' as any,
      entityId: 'entity-1',
      performedBy: { _id: 'user-1' } as any,
      metadata: {} as any,
    });

    expect(logModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        performedBy: { userId: 'user-1' },
      }),
    );
  });

  it('returns an empty manager log result when no warehouses are assigned', async () => {
    warehouseModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    await expect(
      service.getLogs(
        { page: 1, limit: 10 } as any,
        {
          _id: '507f1f77bcf86cd799439011',
          role: 'manager',
        } as any,
      ),
    ).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });
});
