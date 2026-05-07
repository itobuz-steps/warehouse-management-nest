jest.mock('./entities/quantity.entity', () => ({
  Quantity: class Quantity {},
}));

import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QuantityService } from './quantity.service';

describe('QuantityService', () => {
  const quantityModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  };

  let service: QuantityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuantityService(quantityModel as any);
  });

  it('rejects limit updates without a limit value', async () => {
    await expect(
      service.updateLimit('507f1f77bcf86cd799439011', {} as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when a populated quantity record cannot be found after create', async () => {
    quantityModel.create.mockResolvedValue({ _id: 'quantity-1' });
    quantityModel.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.create({} as any)).rejects.toThrow(NotFoundException);
  });

  it('requires both product and warehouse ids for specific quantity lookups', async () => {
    await expect(
      service.getSpecificWarehouseQuantity({
        productId: '',
        warehouseId: '',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates product limit successfully', async () => {
    const updated = {
      _id: 'quantity-1',
      limit: 10,
    };

    quantityModel.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(updated),
    });

    await expect(
      service.updateLimit('507f1f77bcf86cd799439011', {
        limit: 10,
      } as any),
    ).resolves.toEqual(updated);
  });

  it('returns aggregated quantity totals', async () => {
    quantityModel.aggregate.mockResolvedValue([
      {
        _id: 'product-1',
        totalQuantity: 25,
      },
    ]);

    await expect(
      service.getTotalQuantity('507f1f77bcf86cd799439011'),
    ).resolves.toEqual({
      _id: 'product-1',
      totalQuantity: 25,
    });
  });

  it('rejects invalid warehouse ids when fetching products having quantity', async () => {
    await expect(
      service.getProductsHavingQuantity({
        warehouseId: 'invalid-id',
        page: 1,
        limit: 10,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws internal server error when aggregation fails', async () => {
    quantityModel.aggregate.mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('db failed')),
    });

    await expect(
      service.getProductsHavingQuantity({
        page: 1,
        limit: 10,
      } as any),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('throws internal server error when findByProduct database operation fails', async () => {
    quantityModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockRejectedValue(new Error('db failed')),
    });

    await expect(
      service.findByProduct('507f1f77bcf86cd799439011'),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
