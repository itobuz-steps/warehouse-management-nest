jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./dashboard.service', () => ({
  DashboardService: class MockDashboardService {},
}));

import { DashboardController } from './dashboard.controller';

describe('DashboardController', () => {
  const mockService = {
    getInventoryByCategory: jest.fn(),
    generateInventoryByCategoryExcel: jest.fn(),
    getProductTransaction: jest.fn(),
    generateProductTransactionExcel: jest.fn(),
    getTransactionStats: jest.fn(),
    getLowStockProducts: jest.fn(),
    getTopSellingProducts: jest.fn(),
    getMostCancelledProducts: jest.fn(),
    getMostAdjustedProducts: jest.fn(),
    getProfitLoss: jest.fn(),
    getTopFiveProducts: jest.fn(),
    generateTopFiveProductsExcel: jest.fn(),
  };

  const user = { _id: 'user-1', role: 'admin' };
  const req = { user } as any;

  let controller: DashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DashboardController(mockService as any);
  });

  it('transforms cancelled product limit to a number', () => {
    controller.getCancelledProducts(
      req,
      'warehouse-1',
      '2024-01-01',
      '2024-01-31',
      '12',
    );
    expect(mockService.getMostCancelledProducts).toHaveBeenCalledWith(
      'warehouse-1',
      { startDate: '2024-01-01', endDate: '2024-01-31', limit: 12 },
      user,
    );
  });

  it('delegates inventory category requests with the authenticated user', () => {
    controller.getInventoryByCategory(req, 'warehouse-1');

    expect(mockService.getInventoryByCategory).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
  });

  it('streams inventory category excel buffers through the response', async () => {
    const buffer = Buffer.from('inventory-xlsx');
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockService.generateInventoryByCategoryExcel.mockResolvedValue(buffer);

    await controller.exportInventoryCategoryExcel(
      req,
      'warehouse-1',
      res as any,
    );

    expect(mockService.generateInventoryByCategoryExcel).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it('delegates product transaction requests with the authenticated user', () => {
    controller.getProductTransaction(req, 'warehouse-1');

    expect(mockService.getProductTransaction).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
  });

  it('streams product transaction excel buffers through the response', async () => {
    const buffer = Buffer.from('transaction-xlsx');
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockService.generateProductTransactionExcel.mockResolvedValue(buffer);

    await controller.exportTransactionExcel(req, 'warehouse-1', res as any);

    expect(mockService.generateProductTransactionExcel).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it('delegates transaction stats requests', () => {
    controller.getTransactionStats(req, 'warehouse-1');

    expect(mockService.getTransactionStats).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
  });

  it('delegates low stock product requests', () => {
    controller.getLowStockProducts(req, 'warehouse-1');

    expect(mockService.getLowStockProducts).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
  });

  it('delegates top selling product requests with the provided limit', () => {
    controller.getTopSellingProducts(req, 'warehouse-1', 9 as any);

    expect(mockService.getTopSellingProducts).toHaveBeenCalledWith(
      'warehouse-1',
      9,
      user,
    );
  });

  it('defaults cancelled product limit to five when omitted', () => {
    controller.getCancelledProducts(req, 'warehouse-1');

    expect(mockService.getMostCancelledProducts).toHaveBeenCalledWith(
      'warehouse-1',
      { startDate: undefined, endDate: undefined, limit: 5 },
      user,
    );
  });

  it('transforms adjusted product limit to a number', () => {
    controller.getMostAdjustedProducts(req, 'warehouse-1', '7');

    expect(mockService.getMostAdjustedProducts).toHaveBeenCalledWith(
      'warehouse-1',
      { limit: 7 },
      user,
    );
  });

  it('defaults adjusted product limit to five when omitted', () => {
    controller.getMostAdjustedProducts(req, 'warehouse-1');

    expect(mockService.getMostAdjustedProducts).toHaveBeenCalledWith(
      'warehouse-1',
      { limit: 5 },
      user,
    );
  });

  it('passes profit and loss filters through to the service', () => {
    controller.getProfitLoss(
      req,
      'month',
      'warehouse-1',
      '2024-01-01',
      '2024-01-31',
    );

    expect(mockService.getProfitLoss).toHaveBeenCalledWith(
      {
        period: 'month',
        id: 'warehouse-1',
        from: '2024-01-01',
        to: '2024-01-31',
      },
      user,
    );
  });

  it('wraps top product results', async () => {
    mockService.getTopFiveProducts.mockResolvedValue(['product']);

    await expect(
      controller.getTopFiveProducts(req, 'warehouse-1'),
    ).resolves.toEqual({
      message: 'Data fetched successfully',
      success: true,
      data: ['product'],
    });

    expect(mockService.getTopFiveProducts).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
  });

  it('streams generated excel buffers through the response', async () => {
    const buffer = Buffer.from('xlsx');
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockService.generateTopFiveProductsExcel.mockResolvedValue(buffer);

    await controller.generateTopFiveProductsExcel(
      req,
      'warehouse-1',
      res as any,
    );

    expect(mockService.generateTopFiveProductsExcel).toHaveBeenCalledWith(
      'warehouse-1',
      user,
    );
    expect(res.set).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});
