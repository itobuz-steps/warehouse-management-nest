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
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('../config/config.service', () => ({
  __esModule: true,
  default: jest.fn(() => ({ FRONTEND_URL: 'frontend.example.com' })),
}));

import { DashboardService } from './dashboard.service';
import { TIME_RANGE } from './dashboard.constants';
import config from '../config/config.service';

describe('DashboardService', () => {
  const excel = {
    generateTopFiveProductsExcel: jest.fn(),
    generateInventoryByCategoryExcel: jest.fn(),
    generateProductTransactionExcel: jest.fn(),
  };
  const productModel = {};
  const transactionModel = { aggregate: jest.fn() };
  const variantStockModel = { aggregate: jest.fn() };
  const warehouseModel = { find: jest.fn() };

  // admin user — resolveWarehouseIds returns null (no warehouse filter)
  const adminUser = { role: 'ADMIN' } as any;

  let service: DashboardService;

  beforeEach(() => {
    jest.resetAllMocks();
    (config as unknown as jest.Mock).mockReturnValue({
      FRONTEND_URL: 'frontend.example.com',
      STOCK_LIMIT: '20',
    });
    service = new DashboardService(
      excel as any,
      productModel as any,
      transactionModel as any,
      variantStockModel as any,
      warehouseModel as any,
    );
  });

  it('returns undefined for invalid object ids', () => {
    expect(service.toObjectId('invalid-id')).toBeUndefined();
  });

  it('returns an object id for valid ids', () => {
    const id = '507f1f77bcf86cd799439011';

    expect(service.toObjectId(id)?.toString()).toBe(id);
  });

  it('delegates top five product lookups to the data method', async () => {
    const data = [{ productName: 'Apples' }];
    const spy = jest
      .spyOn(service, 'getTopFiveProductsData')
      .mockResolvedValue(data as any);

    await expect(
      service.getTopFiveProducts('warehouse-1', adminUser),
    ).resolves.toBe(data);
    expect(spy).toHaveBeenCalledWith('warehouse-1', adminUser);
  });

  it('generates top five product excel from the data method', async () => {
    const data = [{ productName: 'Apples' }];
    const buffer = Buffer.from('top-products');
    jest
      .spyOn(service, 'getTopFiveProductsData')
      .mockResolvedValue(data as any);
    excel.generateTopFiveProductsExcel.mockReturnValue(buffer);

    await expect(
      service.generateTopFiveProductsExcel('warehouse-1', adminUser),
    ).resolves.toBe(buffer);
    expect(excel.generateTopFiveProductsExcel).toHaveBeenCalledWith(data);
  });

  it('wraps inventory by category data', async () => {
    variantStockModel.aggregate.mockResolvedValue([
      { _id: 'Food', totalProducts: 2 },
    ]);

    await expect(
      service.getInventoryByCategory(undefined, adminUser),
    ).resolves.toEqual({
      message: 'Data fetched successfully',
      success: true,
      data: [{ _id: 'Food', totalProducts: 2 }],
    });
  });

  it('generates inventory by category excel from the data method', async () => {
    const data = [{ _id: 'Food', totalProducts: 2 }];
    const buffer = Buffer.from('inventory');
    jest
      .spyOn(service, 'getInventoryByCategoryData')
      .mockResolvedValue(data as any);
    excel.generateInventoryByCategoryExcel.mockReturnValue(buffer);

    await expect(
      service.generateInventoryByCategoryExcel('warehouse-1', adminUser),
    ).resolves.toBe(buffer);
    expect(excel.generateInventoryByCategoryExcel).toHaveBeenCalledWith(data);
  });

  it('wraps product transaction data', async () => {
    const data = [
      { _id: '01-01-2024', IN: 1, OUT: 0, TRANSFER: 0, ADJUSTMENT: 0 },
    ];
    jest
      .spyOn(service, 'getProductTransactionData')
      .mockResolvedValue(data as any);

    await expect(
      service.getProductTransaction('warehouse-1', adminUser),
    ).resolves.toEqual({
      message: 'Data fetched successfully',
      success: true,
      data,
    });
  });

  it('generates product transaction excel from the data method', async () => {
    const data = [
      { _id: '01-01-2024', IN: 1, OUT: 0, TRANSFER: 0, ADJUSTMENT: 0 },
    ];
    const buffer = Buffer.from('transactions');
    jest
      .spyOn(service, 'getProductTransactionData')
      .mockResolvedValue(data as any);
    excel.generateProductTransactionExcel.mockReturnValue(buffer);

    await expect(
      service.generateProductTransactionExcel('warehouse-1', adminUser),
    ).resolves.toBe(buffer);
    expect(excel.generateProductTransactionExcel).toHaveBeenCalledWith(data);
  });

  it('returns default transaction stats when aggregates are empty', async () => {
    transactionModel.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    variantStockModel.aggregate.mockResolvedValueOnce([]);

    await expect(
      service.getTransactionStats(undefined, adminUser),
    ).resolves.toEqual({
      message: 'Data fetched successfully',
      success: true,
      data: {
        sales: { totalSalesAmount: 0, totalTransactions: 0 },
        purchase: { totalPurchaseAmount: 0, totalTransactions: 0 },
        inventory: { totalVariants: 0 },
        todayShipment: { quantity: 0 },
      },
    });
  });

  it('wraps low stock products from the aggregate', async () => {
    variantStockModel.aggregate.mockResolvedValue([
      {
        productId: 'product-1',
        productName: 'Apples',
        quantity: 4,
        category: 'Food',
      },
    ]);

    await expect(
      service.getLowStockProducts(undefined, adminUser),
    ).resolves.toEqual({
      message: 'Low stock products retrieved successfully',
      success: true,
      data: [
        {
          productId: 'product-1',
          productName: 'Apples',
          quantity: 4,
          category: 'Food',
        },
      ],
    });
  });

  it('wraps top selling products from the aggregate', async () => {
    transactionModel.aggregate.mockResolvedValue([
      { productId: 'product-1', productName: 'Apples', totalSoldQuantity: 3 },
    ]);

    await expect(
      service.getTopSellingProducts(undefined, 3, adminUser),
    ).resolves.toEqual({
      message: 'Top selling products retrieved successfully',
      success: true,
      data: [
        { productId: 'product-1', productName: 'Apples', totalSoldQuantity: 3 },
      ],
    });
  });

  it('wraps most cancelled products from the aggregate', async () => {
    transactionModel.aggregate.mockResolvedValue([
      {
        productId: 'product-1',
        productName: 'Apples',
        totalCancelledQuantity: 2,
      },
    ]);

    await expect(
      service.getMostCancelledProducts(
        undefined,
        { startDate: '2024-01-01', endDate: '2024-01-31', limit: 2 },
        adminUser,
      ),
    ).resolves.toEqual({
      message: 'Most cancelled products retrieved successfully',
      success: true,
      data: [
        {
          productId: 'product-1',
          productName: 'Apples',
          totalCancelledQuantity: 2,
        },
      ],
    });
  });

  it('wraps most adjusted products from the aggregate', async () => {
    transactionModel.aggregate.mockResolvedValue([
      {
        productId: 'product-1',
        productName: 'Apples',
        totalAdjustedQuantity: 5,
      },
    ]);

    await expect(
      service.getMostAdjustedProducts(undefined, { limit: 4 }, adminUser),
    ).resolves.toEqual({
      message: 'Most adjusted products retrieved successfully',
      success: true,
      data: [
        {
          productId: 'product-1',
          productName: 'Apples',
          totalAdjustedQuantity: 5,
        },
      ],
    });
  });

  it('returns profit and loss analytics from the aggregate', async () => {
    const data = [{ label: '05-05-2026', profit: 100, loss: 20, net: 80 }];
    transactionModel.aggregate.mockResolvedValue(data);

    await expect(
      service.getProfitLoss({ period: TIME_RANGE.WEEK }, adminUser),
    ).resolves.toEqual({
      success: true,
      message: 'Profit & Loss Analytics',
      data,
    });
  });

  it('rejects profit and loss requests when from is after to', async () => {
    await expect(
      service.getProfitLoss(
        { from: '2024-02-01', to: '2024-01-01' },
        adminUser,
      ),
    ).rejects.toThrow('`from` date must be before `to` date');
  });
});
