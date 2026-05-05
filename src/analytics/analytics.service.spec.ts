jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/products/entities/product.entity', () => ({
  Product: class Product {},
}));
jest.mock('src/quantity/entities/quantity.entity', () => ({
  Quantity: class Quantity {},
}));
jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
}));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('src/batch/schemas/batch.schema', () => ({ Batch: class Batch {} }));
jest.mock('src/transaction-logs/entities/transaction-log.entity', () => ({
  TransactionLog: class TransactionLog {},
}));

import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const excelService = {};
  const warehouseModel = { findById: jest.fn() };
  const productModel = { findById: jest.fn() };
  const quantityModel = { findOne: jest.fn() };
  const transactionModel = {};
  const variantStockModel = { aggregate: jest.fn() };
  const batchModel = {};
  const transactionLogModel = {};

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(
      excelService as any,
      warehouseModel as any,
      productModel as any,
      quantityModel as any,
      transactionModel as any,
      variantStockModel as any,
      batchModel as any,
      transactionLogModel as any,
    );
  });

  it('proxies getTwoProductQuantities to the data method', async () => {
    const spy = jest
      .spyOn(service, 'getTwoProductQuantitiesData')
      .mockResolvedValue({} as any);

    await service.getTwoProductQuantities({} as any);

    expect(spy).toHaveBeenCalledWith({});
  });

  it('returns warehouse stock aggregation results', async () => {
    variantStockModel.aggregate.mockResolvedValue([{ productId: 'p1' }]);

    await expect(
      service.getWarehouseProductStock('507f1f77bcf86cd799439011'),
    ).resolves.toEqual([{ productId: 'p1' }]);
  });
});
