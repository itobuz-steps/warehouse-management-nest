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
    findOne: jest.fn(),
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

  it('appends uploaded images during update', async () => {
    variantModel.findById.mockResolvedValue({
      variantImage: ['old-image'],
    });

    variantModel.findByIdAndUpdate.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
    });

    const result = await service.update('507f1f77bcf86cd799439011', {
      variantImage: ['new-image'],
    } as any);

    expect(variantModel.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      {
        variantImage: ['old-image', 'new-image'],
      },
      { new: true },
    );

    expect(result).toEqual({
      success: true,
      message: 'Variant updated successfully',
      data: { id: '507f1f77bcf86cd799439011' },
    });
  });

  it('updates variant without modifying images', async () => {
    variantModel.findByIdAndUpdate.mockResolvedValue({
      id: '507f1f77bcf86cd799439011',
    });

    await service.update('507f1f77bcf86cd799439011', {
      price: 100,
    } as any);

    expect(variantModel.findById).not.toHaveBeenCalled();

    expect(variantModel.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { price: 100 },
      { new: true },
    );
  });

  it('returns signed image urls for variants', async () => {
    variantModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        variantImage: ['img-1'],
      }),
    });

    storageService.getPresignedSignedUrl.mockResolvedValue(
      'https://signed-url',
    );

    const result = await service.findById('507f1f77bcf86cd799439011');

    expect(result).toEqual({
      success: true,
      message: 'Variant retrieved successfully',
      data: {
        _id: '507f1f77bcf86cd799439011',
        variantImage: ['https://signed-url'],
      },
    });
  });

  it('returns variants directly when hasStock is false', async () => {
    variantModel.find.mockResolvedValue([{ id: '507f1f77bcf86cd799439011' }]);

    const result = await service.findByProductId(
      '507f1f77bcf86cd799439014',
      '',
      false,
    );

    expect(variantModel.find).toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      message: 'Variants retrieved successfully',
      data: [{ id: '507f1f77bcf86cd799439011' }],
    });
  });

  it('returns variants with aggregated stock when hasStock is true', async () => {
    variantModel.aggregate.mockResolvedValue([{ sku: 'SKU-1', quantity: 5 }]);

    const result = await service.findByProductId(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      true,
    );

    expect(variantModel.aggregate).toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      message: 'Variants retrieved based on product id successfully',
      data: [{ sku: 'SKU-1', quantity: 5 }],
    });
  });

  it('rejects duplicate variants', async () => {
    productModel.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue({
        category: 'Food',
        brand: 'Nestle',
        label: 'Coffee',
      }),
    });

    variantModel.findOne = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue({ _id: 'existing' }),
    });

    await expect(
      service.createInternal('product-1', { flavor: 'Vanilla' }, 100, 20, []),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns variants with stock information', async () => {
    variantModel.aggregate.mockResolvedValue([
      {
        currentStock: 5,
      },
    ]);

    const result = await service.getVariantsStock('507f1f77bcf86cd799439011', [
      '507f1f77bcf86cd799439012',
    ]);

    expect(variantModel.aggregate).toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      message: 'Variants with stock fetched successfully',
      data: [{ currentStock: 5 }],
    });
  });
});
