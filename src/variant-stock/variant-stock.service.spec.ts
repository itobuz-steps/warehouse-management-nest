jest.mock('./schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));

import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { VariantStockService } from './variant-stock.service';
import { VariantStock } from './schemas/variant-stock.schema';

describe('VariantStockService', () => {
  let service: VariantStockService;

  const mockModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
    bulkWrite: jest.fn(),
    find: jest.fn(),
  };

  const variant = new Types.ObjectId();
  const warehouse = new Types.ObjectId();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantStockService,
        { provide: getModelToken(VariantStock.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get(VariantStockService);
  });

  it('validates available stock', async () => {
    mockModel.findOne.mockResolvedValue({ quantity: 10 });
    await expect(service.validateStock(variant, warehouse, 5)).resolves.toBe(
      true,
    );
  });

  it('rejects insufficient stock during validation', async () => {
    mockModel.findOne.mockResolvedValue({ quantity: 1 });
    await expect(service.validateStock(variant, warehouse, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('increments stock with upsert support', async () => {
    await service.increaseStock(variant, warehouse, 3);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { variant, warehouse },
      { $inc: { stock: 3 } },
      { upsert: true, session: undefined },
    );
  });

  it('rejects bulk decreases when any variant has insufficient stock', async () => {
    mockModel.find.mockResolvedValue([{ variantId: variant, quantity: 1 }]);

    await expect(
      service.bulkDecrease([{ variant, warehouse, quantity: 5 }]),
    ).rejects.toThrow(BadRequestException);
  });

  it('decreases stock successfully', async () => {
    mockModel.findOne.mockResolvedValue({ quantity: 10 });

    await service.decreaseStock(variant, warehouse, 5);

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { variant, warehouse },
      { $inc: { stock: -5 } },
      { session: undefined },
    );
  });

  it('rejects decreaseStock when stock is insufficient', async () => {
    mockModel.findOne.mockResolvedValue({
      quantity: 2,
    });

    await expect(service.decreaseStock(variant, warehouse, 5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('returns early when bulkIncrease receives empty operations', async () => {
    await service.bulkIncrease([]);

    expect(mockModel.bulkWrite).not.toHaveBeenCalled();
  });

  it('returns early when bulkDecrease receives empty operations', async () => {
    await service.bulkDecrease([]);

    expect(mockModel.find).not.toHaveBeenCalled();
  });

  it('bulk increases stock successfully', async () => {
    await service.bulkIncrease([
      {
        variant,
        warehouse,
        quantity: 5,
      },
    ]);

    expect(mockModel.bulkWrite).toHaveBeenCalled();
  });

  it('bulk decreases stock successfully', async () => {
    mockModel.find.mockResolvedValue([
      {
        variantId: variant,
        quantity: 10,
      },
    ]);

    await service.bulkDecrease([
      {
        variant,
        warehouse,
        quantity: 5,
      },
    ]);

    expect(mockModel.bulkWrite).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: {
              variant,
              warehouse,
            },
            update: {
              $inc: {
                stock: -5,
              },
            },
          },
        },
      ],
      { session: undefined },
    );
  });

  it('rejects validation when stock record does not exist', async () => {
    mockModel.findOne.mockResolvedValue(null);

    await expect(service.validateStock(variant, warehouse, 1)).rejects.toThrow(
      BadRequestException,
    );
  });
});
