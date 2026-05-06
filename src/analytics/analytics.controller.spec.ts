jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./analytics.service', () => ({
  AnalyticsService: class MockAnalyticsService {},
}));

import { AnalyticsController } from './analytics.controller';

describe('AnalyticsController', () => {
  const mockService = {
    getTwoProductQuantitiesData: jest.fn(),
    getTwoProductComparisonHistory: jest.fn(),
    getTwoProductQuantitiesExcel: jest.fn(),
    getTwoProductComparisonHistoryExcel: jest.fn(),
    getProductsByStock: jest.fn(),
    getVariantsByStock: jest.fn(),
    getWarehouseProductStock: jest.fn(),
    getTopSellingProducts: jest.fn(),
    getTopSellingVariants: jest.fn(),
    getTopStockProducts: jest.fn(),
    getTopStockVariants: jest.fn(),
    getTopBatchesByVolume: jest.fn(),
    getTopConsumedBatches: jest.fn(),
    getDamagedCostBySupplier: jest.fn(),
    getTransactionSummary: jest.fn(),
    getAuditLogsSummary: jest.fn(),
    getAuditLogsTimeline: jest.fn(),
    getAuditLogsActors: jest.fn(),
  };

  let controller: AnalyticsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AnalyticsController(mockService as any);
  });

  it('wraps product quantity data responses', async () => {
    mockService.getTwoProductQuantitiesData.mockResolvedValue(['data']);

    await expect(controller.getTwoProductQuantity({} as any)).resolves.toEqual({
      success: true,
      message: 'Product quantities fetched successfully for the warehouse.',
      data: ['data'],
    });
  });

  it('writes comparison excel to the response', async () => {
    const buffer = Buffer.from('xlsx');
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockService.getTwoProductComparisonHistoryExcel.mockResolvedValue(buffer);

    await controller.downloadComparisonExcel({} as any, res as any);

    expect(res.set).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it('delegates transaction summary with request user', async () => {
    mockService.getTransactionSummary.mockResolvedValue({ total: 1 });

    await expect(
      controller.getTransactionSummary(
        {} as any,
        { user: { _id: 'user-1' } } as any,
      ),
    ).resolves.toEqual({
      success: true,
      message: 'Transaction analytics fetched successfully.',
      data: { total: 1 },
    });
  });
});
