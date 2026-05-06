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

  let controller: DashboardController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DashboardController(mockService as any);
  });

  it('transforms cancelled product limit to a number', () => {
    controller.getCancelledProducts(
      'warehouse-1',
      '2024-01-01',
      '2024-01-31',
      '12',
    );
    expect(mockService.getMostCancelledProducts).toHaveBeenCalledWith(
      'warehouse-1',
      {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 12,
      },
    );
  });

  it('wraps top product results', async () => {
    mockService.getTopFiveProducts.mockResolvedValue(['product']);

    await expect(controller.getTopFiveProducts('warehouse-1')).resolves.toEqual(
      {
        message: 'Data fetched successfully',
        success: true,
        data: ['product'],
      },
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

    await controller.generateTopFiveProductsExcel('warehouse-1', res as any);

    expect(res.set).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });
});
