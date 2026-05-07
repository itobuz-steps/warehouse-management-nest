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

  it('delegates transaction list lookups with the authenticated user', () => {
    const query = { page: 1 } as any;

    controller.getTransactions(query, req);

    expect(mockService.getTransactions).toHaveBeenCalledWith(query, req.user);
  });

  it('delegates single transaction lookups with the authenticated user', () => {
    controller.getTransactionById('transaction-1', req);

    expect(mockService.getTransactionById).toHaveBeenCalledWith(
      'transaction-1',
      req.user,
    );
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

  it('delegates recent supplier lookups', () => {
    controller.getRecentSuppliers(req);

    expect(mockService.getRecentSuppliers).toHaveBeenCalledWith(req.user);
  });

  it('delegates recent customer lookups', () => {
    controller.getRecentCustomers(req);

    expect(mockService.getRecentCustomers).toHaveBeenCalledWith(req.user);
  });

  it('delegates frequent warehouse lookups', () => {
    controller.getFrequentWarehouses(req);

    expect(mockService.getFrequentWarehouses).toHaveBeenCalledWith(req.user);
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

  it('delegates warehouse transaction lookups', () => {
    const query = { page: 2 } as any;

    controller.getWarehouseTransactions('warehouse-1', query);

    expect(mockService.getWarehouseTransactions).toHaveBeenCalledWith(
      'warehouse-1',
      query,
    );
  });

  it('delegates stock-in creation with the authenticated user', () => {
    const dto = { reference: 'in-1' } as any;

    controller.createStockIn(req, dto);

    expect(mockService.createStockIn).toHaveBeenCalledWith(dto, req.user);
  });

  it('delegates stock-out creation with the authenticated user', () => {
    const dto = { reference: 'out-1' } as any;

    controller.createStockOut(req, dto);

    expect(mockService.createStockOut).toHaveBeenCalledWith(dto, req.user);
  });

  it('delegates transfer creation with the authenticated user', () => {
    const dto = { reference: 'transfer-1' } as any;

    controller.createTransfer(req, dto);

    expect(mockService.createTransfer).toHaveBeenCalledWith(dto, req.user);
  });

  it('delegates adjustment creation with the authenticated user', () => {
    const dto = { reference: 'adjustment-1' } as any;

    controller.createAdjustment(req, dto);

    expect(mockService.createAdjustment).toHaveBeenCalledWith(dto, req.user);
  });

  it('delegates transaction approval with the admin id', () => {
    controller.approveTransaction('transaction-1', req);

    expect(mockService.approveTransaction).toHaveBeenCalledWith(
      'transaction-1',
      'user-1',
    );
  });

  it('delegates transaction rejection with the admin id', () => {
    controller.rejectTransaction('transaction-1', req);

    expect(mockService.rejectTransaction).toHaveBeenCalledWith(
      'transaction-1',
      'user-1',
    );
  });

  it('maps shipment cancellation to cancelled status', () => {
    controller.cancel(req, 'transaction-1');

    expect(mockService.updateShipmentStatus).toHaveBeenCalledWith(
      'transaction-1',
      'cancelled',
      req.user,
    );
  });

  it('maps shipment returns to returned status', () => {
    controller.return(req, 'transaction-1');

    expect(mockService.updateShipmentStatus).toHaveBeenCalledWith(
      'transaction-1',
      'returned',
      req.user,
    );
  });

  it('delegates invoice generation', () => {
    controller.generateInvoice('transaction-1');

    expect(mockService.generateInvoice).toHaveBeenCalledWith('transaction-1');
  });
});
