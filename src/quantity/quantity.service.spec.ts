jest.mock('./entities/quantity.entity', () => ({
  Quantity: class Quantity {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
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
});
