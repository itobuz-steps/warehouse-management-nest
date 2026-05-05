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
});
