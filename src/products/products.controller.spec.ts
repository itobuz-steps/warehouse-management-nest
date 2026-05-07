jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./products.service', () => ({
  ProductsService: class MockProductsService {},
}));

jest.mock('src/storage/storage.service', () => ({
  StorageService: class MockStorageService {},
}));

import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  const mockProductsService = {
    getProductsForWarehouse: jest.fn(),
    exportProductsCsv: jest.fn(),
    findOne: jest.fn(),
    getProducts: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
    findArchived: jest.fn(),
    generateQrCode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('frontend.example.com'),
  };

  const mockStorageService = {
    uploadMultipleFiles: jest.fn(),
  };

  let controller: ProductsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ProductsController(
      mockProductsService as any,
      mockConfigService as any,
      mockStorageService as any,
    );
  });

  it('wraps warehouse product queries', async () => {
    mockProductsService.getProductsForWarehouse.mockResolvedValue(['product']);

    await expect(
      controller.getProductsForWarehouse({ warehouseId: 'warehouse-1' } as any),
    ).resolves.toEqual({
      success: true,
      data: ['product'],
    });
  });

  it('exports product csv files through the response', async () => {
    const res = { set: jest.fn(), send: jest.fn() };
    mockProductsService.exportProductsCsv.mockResolvedValue('csv-data');

    await controller.exportProductsCsv({ page: 1 } as any, res as any);

    expect(mockProductsService.exportProductsCsv).toHaveBeenCalledWith({
      page: 1,
    });
    expect(res.set).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('csv-data');
  });

  it('wraps single product lookups', async () => {
    mockProductsService.findOne.mockResolvedValue({ id: 'product-1' });

    await expect(controller.getProduct('product-1')).resolves.toEqual({
      success: true,
      data: { id: 'product-1' },
    });
  });

  it('wraps product list queries', async () => {
    mockProductsService.getProducts.mockResolvedValue(['product']);

    await expect(controller.getProducts({ page: 1 } as any)).resolves.toEqual({
      success: true,
      data: ['product'],
    });
  });

  it('wraps product updates', async () => {
    mockProductsService.update.mockResolvedValue({ id: 'product-1' });

    await expect(
      controller.updateProduct(
        'product-1',
        { name: 'Updated' } as any,
        { user: { _id: 'user-1' } } as any,
      ),
    ).resolves.toEqual({
      success: true,
      message: 'Product updated successfully',
      data: { id: 'product-1' },
    });
  });

  it('creates a product without uploading when no files are provided', async () => {
    mockProductsService.create.mockResolvedValue({ id: 'product-1' });

    await expect(
      controller.createProduct(
        { name: 'Product' } as any,
        [] as any,
        { user: { _id: 'user-1' } } as any,
      ),
    ).resolves.toEqual({
      success: true,
      message: 'Product Successfully Saved',
      data: { id: 'product-1' },
    });

    expect(mockProductsService.create).toHaveBeenCalledWith(
      'user-1',
      { name: 'Product' },
      { _id: 'user-1' },
      [],
    );
  });

  it('uploads variant images before creating a product', async () => {
    mockStorageService.uploadMultipleFiles.mockResolvedValue([
      { key: 'img-1' },
    ]);
    mockProductsService.create.mockResolvedValue({ id: 'product-1' });

    await controller.createProduct(
      { name: 'Product' } as any,
      [{ originalname: 'a.png' }] as any,
      { user: { _id: 'user-1' } } as any,
    );

    expect(mockStorageService.uploadMultipleFiles).toHaveBeenCalled();
    expect(mockProductsService.create).toHaveBeenCalledWith(
      'user-1',
      { name: 'Product' },
      { _id: 'user-1' },
      ['img-1'],
    );
  });

  it('builds a qr url from the request protocol and configured frontend host', async () => {
    const buffer = Buffer.from('png');
    const res = { setHeader: jest.fn(), send: jest.fn() };
    mockProductsService.generateQrCode.mockResolvedValue(buffer);

    await controller.getProductQrCode(
      'product-1',
      { protocol: 'https' } as any,
      res as any,
    );

    expect(mockProductsService.generateQrCode).toHaveBeenCalledWith(
      'https://frontend.example.com/pages/qr-product.html?id=product-1',
    );
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it('archives a product and returns the success message', async () => {
    await expect(
      controller.deleteProduct('product-1', { user: { _id: 'user-1' } } as any),
    ).resolves.toEqual({
      success: true,
      message: 'Product archived successfully',
    });

    expect(mockProductsService.remove).toHaveBeenCalledWith('product-1', {
      _id: 'user-1',
    });
  });

  it('restores a product and returns the success message', async () => {
    await expect(
      controller.restoreProduct('product-1', {
        user: { _id: 'user-1' },
      } as any),
    ).resolves.toEqual({
      success: true,
      message: 'Product restored successfully',
    });

    expect(mockProductsService.restore).toHaveBeenCalledWith('product-1', {
      _id: 'user-1',
    });
  });

  it('wraps archived product queries', async () => {
    mockProductsService.findArchived.mockResolvedValue(['archived']);

    await expect(
      controller.getArchivedProducts({ page: 1 } as any),
    ).resolves.toEqual({
      success: true,
      data: ['archived'],
    });
  });

  it('wraps qr product lookups', async () => {
    mockProductsService.findOne.mockResolvedValue({ id: 'product-1' });

    await expect(controller.getProductById('product-1')).resolves.toEqual({
      message: 'Product with specific id',
      success: true,
      data: { id: 'product-1' },
    });
  });
});
