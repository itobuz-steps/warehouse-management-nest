jest.mock('./entities/product.entity', () => ({ Product: class Product {} }));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('qrcode', () => ({
  toBuffer: jest.fn(),
}));
jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: class TransactionLogsService {},
}));

import * as QRCode from 'qrcode';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  const productModel = {
    aggregate: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const variantStockModel = {
    find: jest.fn(),
  };
  const variantService = {
    createInternal: jest.fn(),
  };
  const logsService = {
    createLog: jest.fn(),
  };

  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(
      productModel as any,
      variantStockModel as any,
      variantService as any,
      logsService as any,
    );
  });

  it('exports products as escaped csv rows', async () => {
    jest.spyOn(service, 'getProducts').mockResolvedValue({
      products: [
        {
          _id: 'p1',
          name: 'Widget',
          category: 'Tools',
          brand: 'Acme',
          label: 'WID1',
          description: 'Useful',
          isArchived: false,
          variantCount: 2,
        },
      ],
    } as any);

    await expect(service.exportProductsCsv({} as any)).resolves.toContain(
      '"Widget"',
    );
  });

  it('filters products by category when fetching warehouse products', async () => {
    productModel.find.mockResolvedValue([]);

    await service.getProductsForWarehouse({ category: 'Tools' } as any);

    expect(productModel.find).toHaveBeenCalledWith({
      isArchived: false,
      category: 'Tools',
    });
  });

  it('throws when updating a missing product', async () => {
    productModel.findById.mockResolvedValue(null);

    await expect(
      service.update(
        '507f1f77bcf86cd799439011',
        { name: 'Updated' } as any,
        {} as any,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('delegates qr code generation to qrcode', async () => {
    (QRCode.toBuffer as jest.Mock).mockResolvedValue(Buffer.from('png'));

    await expect(
      service.generateQrCode('https://example.com'),
    ).resolves.toEqual(Buffer.from('png'));
  });
});
