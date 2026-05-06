jest.mock('./schemas/variant.schema', () => ({ Variant: class Variant {} }));
jest.mock('src/products/entities/product.entity', () => ({
  Product: class Product {},
}));
jest.mock('src/auth/entities/auth.entity', () => ({ User: class User {} }));
jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: class TransactionLogsService {},
}));

import { BadRequestException } from '@nestjs/common';
import { VariantService } from './variant.service';

describe('VariantService', () => {
  const variantModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn(),
  };
  const productModel = {
    findById: jest.fn(),
  };
  const storageService = {
    getPresignedSignedUrl: jest.fn(),
  };
  const logsService = {
    createLog: jest.fn(),
  };

  let service: VariantService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VariantService(
      variantModel as any,
      productModel as any,
      storageService as any,
      logsService as any,
    );
  });

  it('wraps createInternal responses in the public create response', async () => {
    jest
      .spyOn(service, 'createInternal')
      .mockResolvedValue({ sku: 'SKU-1' } as any);

    await expect(
      service.create(
        {
          product: 'product-1',
          attributes: { color: 'blue' },
          price: 10,
          markup: 20,
          variantImage: [],
        } as any,
        { _id: 'user-1' } as any,
      ),
    ).resolves.toEqual({
      success: true,
      message: 'Variant created successfully',
      data: { sku: 'SKU-1' },
    });
  });

  it('returns a not found response when a variant cannot be found', async () => {
    variantModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findById('507f1f77bcf86cd799439011')).resolves.toEqual(
      {
        success: false,
        message: 'Variant not found',
        data: null,
      },
    );
  });

  it('rejects variant creation when the product does not exist', async () => {
    productModel.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.createInternal('product-1', { color: 'blue' }, 10, 20, []),
    ).rejects.toThrow(BadRequestException);
  });
});
