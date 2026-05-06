jest.mock('src/quantity/entities/quantity.entity', () => ({
  Quantity: class Quantity {},
}));
jest.mock('src/products/entities/product.entity', () => ({
  Product: class Product {},
}));
jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
}));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('../config/config.service', () => ({
  __esModule: true,
  default: jest.fn(() => ({ FRONTEND_URL: 'frontend.example.com' })),
}));

import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const excel = {
    generateTopFiveProductsExcel: jest.fn(),
    generateInventoryByCategoryExcel: jest.fn(),
  };
  const productModel = {};
  const transactionModel = {};
  const variantStockModel = {
    aggregate: jest.fn(),
  };

  let service: DashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(
      excel as any,
      productModel as any,
      transactionModel as any,
      variantStockModel as any,
    );
  });

  it('returns undefined for invalid object ids', () => {
    expect(service.toObjectId('invalid-id')).toBeUndefined();
  });

  it('wraps inventory by category data', async () => {
    variantStockModel.aggregate.mockResolvedValue([
      { _id: 'Food', totalProducts: 2 },
    ]);

    await expect(service.getInventoryByCategory()).resolves.toEqual({
      message: 'Data fetched successfully',
      success: true,
      data: [{ _id: 'Food', totalProducts: 2 }],
    });
  });
});
