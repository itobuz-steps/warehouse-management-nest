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
  const req = { user: { _id: 'user-1' } } as any;

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

  it('wraps comparison history responses', async () => {
    mockService.getTwoProductComparisonHistory.mockResolvedValue(['history']);

    await expect(controller.getComparisonHistory({} as any)).resolves.toEqual({
      success: true,
      message: 'Transaction comparison history fetched successfully.',
      data: ['history'],
    });
  });

  it('writes quantity excel to the response', async () => {
    const buffer = Buffer.from('xlsx');
    const res = {
      set: jest.fn(),
      end: jest.fn(),
    };
    mockService.getTwoProductQuantitiesExcel.mockResolvedValue(buffer);

    await controller.downloadExcel({} as any, res as any);

    expect(mockService.getTwoProductQuantitiesExcel).toHaveBeenCalledWith({});
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Length': buffer.length,
      }),
    );
    expect(res.end).toHaveBeenCalledWith(buffer);
  });

  it('delegates products by stock lookups with the default order', async () => {
    await controller.getProductsByStock({
      limit: 5,
      warehouseId: 'warehouse-1',
    } as any);

    expect(mockService.getProductsByStock).toHaveBeenCalledWith(
      'desc',
      5,
      'warehouse-1',
    );
  });

  it('delegates variants by stock lookups with the provided order', async () => {
    await controller.getVariantsByStock({
      order: 'asc',
      limit: 2,
      warehouseId: 'warehouse-1',
    } as any);

    expect(mockService.getVariantsByStock).toHaveBeenCalledWith(
      'asc',
      2,
      'warehouse-1',
    );
  });

  it('delegates warehouse product stock lookups', async () => {
    await controller.getWarehouseProductStock({
      warehouseId: 'warehouse-1',
    } as any);

    expect(mockService.getWarehouseProductStock).toHaveBeenCalledWith(
      'warehouse-1',
    );
  });

  it('delegates top selling product analytics with the authenticated user', () => {
    controller.getTopSellingProducts(req, undefined, 4 as any, 'warehouse-1');

    expect(mockService.getTopSellingProducts).toHaveBeenCalledWith(
      'desc',
      4,
      'warehouse-1',
      req.user,
    );
  });

  it('delegates top selling variant analytics', () => {
    controller.getTopSellingVariants(req, 'product-1', 'warehouse-1');

    expect(mockService.getTopSellingVariants).toHaveBeenCalledWith(
      'product-1',
      'warehouse-1',
      req.user,
    );
  });

  it('delegates top stock product analytics', () => {
    controller.getTopStockProducts(req, 'asc', 3 as any, 'warehouse-1');

    expect(mockService.getTopStockProducts).toHaveBeenCalledWith(
      'asc',
      3,
      'warehouse-1',
      req.user,
    );
  });

  it('delegates top stock variant analytics', () => {
    controller.getTopStockVariants(req, 'product-1', 'warehouse-1');

    expect(mockService.getTopStockVariants).toHaveBeenCalledWith(
      'product-1',
      'warehouse-1',
      req.user,
    );
  });

  it('delegates top batch volume analytics', () => {
    controller.getTopBatchesByVolume(req, undefined, 8 as any, 'warehouse-1');

    expect(mockService.getTopBatchesByVolume).toHaveBeenCalledWith(
      'desc',
      8,
      'warehouse-1',
      req.user,
    );
  });

  it('delegates top consumed batch analytics', () => {
    controller.getTopConsumedBatches(req, 6 as any, 'warehouse-1');

    expect(mockService.getTopConsumedBatches).toHaveBeenCalledWith(
      6,
      'warehouse-1',
      req.user,
    );
  });

  it('delegates damaged cost by supplier analytics', () => {
    const query = { warehouseId: 'warehouse-1' } as any;

    controller.getDamagedCostBySupplier(query);

    expect(mockService.getDamagedCostBySupplier).toHaveBeenCalledWith(query);
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

  it('wraps audit log summary responses', async () => {
    mockService.getAuditLogsSummary.mockResolvedValue({ total: 2 });

    await expect(controller.getAuditLogsSummary({} as any)).resolves.toEqual({
      success: true,
      message: 'Audit logs summary fetched successfully.',
      data: { total: 2 },
    });
  });

  it('wraps audit log timeline responses', async () => {
    mockService.getAuditLogsTimeline.mockResolvedValue(['timeline']);

    await expect(controller.getAuditLogsTimeline({} as any)).resolves.toEqual({
      success: true,
      message: 'Audit logs timeline fetched successfully.',
      data: ['timeline'],
    });
  });

  it('wraps audit log actor responses', async () => {
    mockService.getAuditLogsActors.mockResolvedValue(['actor']);

    await expect(controller.getAuditLogActors({} as any)).resolves.toEqual({
      success: true,
      message: 'Audit log actors fetched successfully.',
      data: ['actor'],
    });
  });
});
