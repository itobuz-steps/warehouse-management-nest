jest.mock('./schemas/batch.schema', () => ({ Batch: class Batch {} }));
jest.mock('src/variant/schemas/variant.schema', () => ({
  Variant: class Variant {},
}));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: class TransactionLogsService {},
}));

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BatchService } from './batch.service';

describe('BatchService', () => {
  let batchModel: any;
  let service: BatchService;

  beforeEach(() => {
    jest.clearAllMocks();

    batchModel = function (this: any, payload: any) {
      this.payload = payload;
      this.save = jest.fn().mockResolvedValue({ _id: 'batch-1', ...payload });
      return this;
    } as any;
    batchModel.findById = jest.fn();
    batchModel.find = jest.fn();
    batchModel.countDocuments = jest.fn();

    service = new BatchService(
      {} as any,
      batchModel,
      {} as any,
      {} as any,
      {
        find: jest.fn(),
        exists: jest.fn(),
      } as any,
      { createLog: jest.fn() } as any,
    );
  });

  it('creates a batch with normalized batch items', async () => {
    const result = await service.create({
      sourceWarehouse: '507f1f77bcf86cd799439011',
      destinationWarehouse: '507f1f77bcf86cd799439012',
      items: [{ variant: '507f1f77bcf86cd799439013', quantity: 5 }],
    } as any);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Batch created successfully');
    expect(result.data.items[0]).toEqual(
      expect.objectContaining({
        quantity: 5,
        remainingQuantity: 5,
        damagedQuantity: 0,
      }),
    );
  });

  it('throws when a requested batch does not exist', async () => {
    const query = {
      populate: jest.fn().mockReturnThis(),
      then: (resolve: (value: null) => unknown) => resolve(null),
    };
    batchModel.findById.mockReturnValue(query);

    await expect(
      service.findOne('batch-1', { role: 'admin', _id: 'user-1' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects invalid destination warehouse filters for non-admin queries', async () => {
    const warehouseModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ _id: 'warehouse-1' }]),
        }),
      }),
      exists: jest.fn(),
    };
    service = new BatchService(
      {} as any,
      batchModel,
      {} as any,
      {} as any,
      warehouseModel as any,
      { createLog: jest.fn() } as any,
    );

    await expect(
      service.findAll(
        { destinationWarehouse: 'invalid-id' } as any,
        { role: 'manager', _id: '507f1f77bcf86cd799439011' } as any,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
