jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./transaction.service', () => ({
  TransactionService: class MockTransactionService {},
}));

import { TransactionController } from './transaction.controller';

describe('TransactionController', () => {
  const mockService = {
    getTransactions: jest.fn(),
    getTransactionById: jest.fn(),
    getFrequentProducts: jest.fn(),
    getRecentSuppliers: jest.fn(),
    getRecentCustomers: jest.fn(),
    getFrequentWarehouses: jest.fn(),
    exportTransactionsCsv: jest.fn(),
    getWarehouseTransactions: jest.fn(),
    createStockIn: jest.fn(),
    createStockOut: jest.fn(),
    createTransfer: jest.fn(),
    createAdjustment: jest.fn(),
    approveTransaction: jest.fn(),
    rejectTransaction: jest.fn(),
    updateShipmentStatus: jest.fn(),
    generateInvoice: jest.fn(),
  };

  let controller: TransactionController;
  const req = { user: { _id: 'user-1' } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TransactionController(mockService as any);
  });

  it('delegates frequent product lookups', () => {
    controller.getFrequentProducts({
      warehouseId: 'warehouse-1',
      type: 'out',
      supplierId: 'supplier-1',
    } as any);

    expect(mockService.getFrequentProducts).toHaveBeenCalledWith(
      'warehouse-1',
      'out',
      'supplier-1',
    );
  });

  it('maps shipment approval to shipped status', () => {
    controller.ship(req, 'transaction-1');
    expect(mockService.updateShipmentStatus).toHaveBeenCalledWith(
      'transaction-1',
      'shipped',
      req.user,
    );
  });

  it('exports csv through the response', async () => {
    const res = { set: jest.fn(), send: jest.fn() };
    mockService.exportTransactionsCsv.mockResolvedValue('csv-data');

    await controller.exportTransactionsCsv({ page: 1 } as any, req, res as any);

    expect(res.set).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith('csv-data');
  });
});
