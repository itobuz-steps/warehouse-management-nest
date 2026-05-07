jest.mock('./quantity.service', () => ({
  QuantityService: class MockQuantityService {},
}));

import { QuantityController } from './quantity.controller';

describe('QuantityController', () => {
  const mockService = {
    create: jest.fn(),
    updateLimit: jest.fn(),
    getTotalQuantity: jest.fn(),
    getSpecificWarehouseQuantity: jest.fn(),
    getProductsHavingQuantity: jest.fn(),
    getWarehouseProducts: jest.fn(),
    findByProduct: jest.fn(),
    getWarehouseAndCategorySpecificProducts: jest.fn(),
  };

  let controller: QuantityController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new QuantityController(mockService as any);
  });

  it('wraps quantity creation responses', async () => {
    mockService.create.mockResolvedValue({ id: 'quantity-1' });

    await expect(
      controller.addProductQuantity({ productId: 'product-1' } as any),
    ).resolves.toEqual({
      message: 'Product Quantity Updated',
      success: true,
      data: { id: 'quantity-1' },
    });
  });

  it('wraps product limit updates', async () => {
    mockService.updateLimit.mockResolvedValue({ id: 'quantity-1', limit: 10 });

    await expect(
      controller.updateProductLimit('quantity-1', { limit: 10 } as any),
    ).resolves.toEqual({
      success: true,
      message: 'Product limit updated successfully',
      data: { id: 'quantity-1', limit: 10 },
    });
  });

  it('wraps total quantity responses', async () => {
    mockService.getTotalQuantity.mockResolvedValue({ total: 10 });

    await expect(
      controller.getTotalProductQuantity('product-1'),
    ).resolves.toEqual({
      message: 'All Product Total Quantity',
      success: true,
      data: { total: 10 },
    });
  });

  it('delegates specific warehouse quantity queries', async () => {
    mockService.getSpecificWarehouseQuantity.mockResolvedValue({ quantity: 2 });

    await expect(
      controller.getProductQuantityAcrossSpecificWarehouse({
        warehouseId: 'w1',
      } as any),
    ).resolves.toEqual({
      message: 'Warehouse Specific Product Quantity',
      success: true,
      data: { quantity: 2 },
    });
  });

  it('passes warehouse and category params', async () => {
    mockService.getWarehouseAndCategorySpecificProducts.mockResolvedValue([]);

    await controller.getWarehouseAndCategorySpecificProducts(
      'warehouse-1',
      'food',
    );

    expect(
      mockService.getWarehouseAndCategorySpecificProducts,
    ).toHaveBeenCalledWith('warehouse-1', 'food');
  });

  it('wraps products having quantity responses', async () => {
    mockService.getProductsHavingQuantity.mockResolvedValue(['product']);

    await expect(
      controller.getProductsHavingQuantity({ search: 'a' } as any),
    ).resolves.toEqual({
      message: 'Products with quantity information',
      success: true,
      data: ['product'],
    });
  });

  it('wraps warehouse-specific product responses', async () => {
    mockService.getWarehouseProducts.mockResolvedValue(['product']);

    await expect(
      controller.getWarehouseSpecificProducts('warehouse-1'),
    ).resolves.toEqual({
      message: 'Specific Warehouse all products',
      success: true,
      data: ['product'],
    });
  });

  it('wraps product warehouse lookup responses', async () => {
    mockService.findByProduct.mockResolvedValue(['warehouse']);

    await expect(
      controller.getProductSpecificWarehouses({
        productId: 'product-1',
      } as any),
    ).resolves.toEqual({
      message: 'Warehouse where that specific Product is stored',
      success: true,
      data: ['warehouse'],
    });
  });
});
