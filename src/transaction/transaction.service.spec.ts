jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
}));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/products/entities/product.entity', () => ({
  Product: class Product {},
}));
jest.mock('src/variant/schemas/variant.schema', () => ({
  Variant: class Variant {},
}));
jest.mock('src/customer/entities/customer.entity', () => ({
  Customer: class Customer {},
}));
jest.mock('src/supplier/entities/supplier.entity', () => ({
  Supplier: class Supplier {},
}));
jest.mock('src/batch/schemas/batch.schema', () => ({ Batch: class Batch {} }));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('src/storage/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('src/notification/notification.service', () => ({
  NotificationService: class NotificationService {},
}));
jest.mock('src/notification/notification-trigger.service', () => ({
  NotificationTriggerService: class NotificationTriggerService {},
}));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: class TransactionLogsService {},
}));
jest.mock('src/mail/mail.service', () => ({
  MailService: class MailService {},
}));
jest.mock('./services/pdf.service', () => ({
  PdfService: class PdfService {},
}));

import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  const transactionModel = {};
  const warehouseModel = {};
  const productModel = {};
  const variantModel = {};
  const customerModel = {};
  const supplierModel = { findById: jest.fn() };
  const connection = {};
  const batchModel = {};
  const variantStockModel = { find: jest.fn() };
  const pdfService = {};
  const notificationService = {};
  const notificationTriggerService = {};
  const logsService = {};
  const storageService = {};
  const mailService = {};

  let service: TransactionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TransactionService(
      transactionModel as any,
      warehouseModel as any,
      productModel as any,
      variantModel as any,
      customerModel as any,
      supplierModel as any,
      connection as any,
      batchModel as any,
      variantStockModel as any,
      pdfService as any,
      notificationService as any,
      notificationTriggerService as any,
      logsService as any,
      storageService as any,
      mailService as any,
    );
  });

  it('returns empty frequent products when an inbound supplier does not exist', async () => {
    supplierModel.findById.mockResolvedValue(null);

    await expect(
      service.getFrequentProducts(
        '507f1f77bcf86cd799439011',
        'IN' as any,
        '507f1f77bcf86cd799439012',
      ),
    ).resolves.toEqual({ mostUsed: [], recentlyUsed: [] });
  });

  it('returns empty frequent products when outbound stock is unavailable', async () => {
    variantStockModel.find.mockResolvedValue([]);

    await expect(
      service.getFrequentProducts('507f1f77bcf86cd799439011', 'OUT' as any),
    ).resolves.toEqual({ mostUsed: [], recentlyUsed: [] });
  });
});
