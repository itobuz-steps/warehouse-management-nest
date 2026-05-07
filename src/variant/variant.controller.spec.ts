jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./variant.service', () => ({
  VariantService: class MockVariantService {},
}));

jest.mock('src/storage/storage.service', () => ({
  StorageService: class MockStorageService {},
}));

import { VariantController } from './variant.controller';

describe('VariantController', () => {
  const mockVariantService = {
    create: jest.fn(),
    update: jest.fn(),
    getVariantsStock: jest.fn(),
    findById: jest.fn(),
    findByProductId: jest.fn(),
  };

  const mockStorageService = {
    uploadMultipleFiles: jest.fn(),
    getPresignedSignedUrl: jest.fn(),
  };

  let controller: VariantController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VariantController(
      mockVariantService as any,
      mockStorageService as any,
    );
  });

  it('creates variants with uploaded image keys', async () => {
    mockStorageService.uploadMultipleFiles.mockResolvedValue([
      { key: 'img-1' },
    ]);
    mockVariantService.create.mockResolvedValue({ id: 'variant-1' });

    await controller.create(
      { name: 'Variant' } as any,
      [{ originalname: 'variant.png' }] as any,
      { user: { _id: 'user-1' } } as any,
    );

    expect(mockVariantService.create).toHaveBeenCalledWith(
      { name: 'Variant', variantImage: ['img-1'] },
      { _id: 'user-1' },
    );
  });

  it('creates variants without images when no files are uploaded', async () => {
    mockVariantService.create.mockResolvedValue({ id: 'variant-1' });

    await controller.create(
      { name: 'Variant' } as any,
      [] as any,
      { user: { _id: 'user-1' } } as any,
    );

    expect(mockStorageService.uploadMultipleFiles).not.toHaveBeenCalled();

    expect(mockVariantService.create).toHaveBeenCalledWith(
      {
        name: 'Variant',
        variantImage: [],
      },
      { _id: 'user-1' },
    );
  });

  it('updates variants with presigned image urls', async () => {
    mockStorageService.uploadMultipleFiles.mockResolvedValue([
      { key: 'img-1' },
    ]);
    mockStorageService.getPresignedSignedUrl.mockResolvedValue(
      'https://signed/img-1',
    );

    await controller.update(
      'variant-1',
      { sku: 'SKU-1' } as any,
      [{ originalname: 'variant.png' }] as any,
    );

    expect(mockVariantService.update).toHaveBeenCalledWith('variant-1', {
      sku: 'SKU-1',
      variantImage: ['https://signed/img-1'],
    });
  });

  it('updates variants without variantImage when no files are uploaded', async () => {
    await controller.update('variant-1', { sku: 'SKU-1' } as any, [] as any);

    expect(mockVariantService.update).toHaveBeenCalledWith('variant-1', {
      sku: 'SKU-1',
    });
  });

  it('converts hasStock query flags to booleans', async () => {
    await controller.findByProductId('product-1', {
      warehouseId: 'warehouse-1',
      hasStock: 'true',
    });

    expect(mockVariantService.findByProductId).toHaveBeenCalledWith(
      'product-1',
      'warehouse-1',
      true,
    );
  });

  it('gets variant stock data', async () => {
    mockVariantService.getVariantsStock.mockResolvedValue({
      success: true,
    });

    const dto = {
      warehouseId: 'warehouse-1',
      variantIds: ['v1'],
    };

    await controller.getVariantsWithStock(dto as any);

    expect(mockVariantService.getVariantsStock).toHaveBeenCalledWith(
      'warehouse-1',
      ['v1'],
    );
  });

  it('gets variant by id', async () => {
    mockVariantService.findById.mockResolvedValue({ id: 'variant-1' });

    await controller.findById('variant-1');

    expect(mockVariantService.findById).toHaveBeenCalledWith('variant-1');
  });
});
