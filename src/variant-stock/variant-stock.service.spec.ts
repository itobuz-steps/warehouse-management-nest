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
});
