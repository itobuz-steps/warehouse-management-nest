jest.mock('src/auth/entities/auth.entity', () => ({ User: class User {} }));
jest.mock('src/products/entities/product.entity', () => ({
  Product: class Product {},
}));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
}));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('src/variant/schemas/variant.schema', () => ({
  Variant: class Variant {},
}));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: class TransactionLogsService {},
}));
jest.mock('dotenv', () => ({
  configDotenv: jest.fn(),
}));
jest.mock('./notification.helper', () => ({
  NotificationHelper: class NotificationHelper {},
}));

import { Types } from 'mongoose';
import { NotificationTriggerService } from './notification-trigger.service';

describe('NotificationTriggerService', () => {
  let consoleLogSpy: jest.SpyInstance;
  const helper = { notify: jest.fn() };
  const userModel = { findById: jest.fn(), find: jest.fn() };
  const productModel = { findById: jest.fn() };
  const warehouseModel = { findById: jest.fn() };
  const transactionModel = { findById: jest.fn() };
  const variantStockModel = { findOne: jest.fn(), find: jest.fn() };
  const variantModel = { findById: jest.fn() };
  const logsService = { createLog: jest.fn() };

  let service: NotificationTriggerService;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    service = new NotificationTriggerService(
      helper as any,
      userModel as any,
      productModel as any,
      warehouseModel as any,
      transactionModel as any,
      variantStockModel as any,
      variantModel as any,
      logsService as any,
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('returns early when stock is above the low stock threshold', async () => {
    variantStockModel.findOne.mockResolvedValue({ quantity: 60 });
    const productId = '507f1f77bcf86cd799439011';
    const variantId = '507f1f77bcf86cd799439012';

    await expect(
      service.notifyLowStock(
        productId,
        variantId,
        new Types.ObjectId(),
        new Types.ObjectId(),
      ),
    ).resolves.toBeUndefined();

    expect(helper.notify).not.toHaveBeenCalled();
  });

  it('returns early when no transaction recipients are found', async () => {
    productModel.findById.mockResolvedValue({
      _id: 'product-1',
      name: 'Product',
    });
    warehouseModel.findById.mockResolvedValue({
      _id: 'warehouse-1',
      name: 'Warehouse',
      managerIds: [],
    });
    transactionModel.findById.mockResolvedValue({
      _id: 'transaction-1',
      type: 'OUT',
    });
    userModel.find.mockResolvedValue([]);

    await expect(
      service.notifyTransaction(
        new Types.ObjectId(),
        new Types.ObjectId(),
        '507f1f77bcf86cd799439011',
        2,
        'OUT',
        '507f1f77bcf86cd799439012',
      ),
    ).resolves.toBeUndefined();
  });
});
