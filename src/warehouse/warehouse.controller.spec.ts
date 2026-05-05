jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {},
}));

jest.mock('./warehouse.service', () => ({
  WarehouseService: class MockWarehouseService {},
}));

jest.mock('src/storage/storage.service', () => ({
  StorageService: class MockStorageService {},
}));

import { WarehouseController } from './warehouse.controller';

describe('WarehouseController', () => {
  const mockService = {
    getWarehouses: jest.fn(),
    getWarehouseById: jest.fn(),
    getWarehouseCapacity: jest.fn(),
    addWarehouse: jest.fn(),
    updateWarehouse: jest.fn(),
    deleteWarehouse: jest.fn(),
    getWarehouseHealthComparison: jest.fn(),
    getWarehouseCapacityComparison: jest.fn(),
  };

  const mockStorageService = {
    uploadSingleFile: jest.fn(),
  };

  let controller: WarehouseController;
  const user = { _id: 'user-1' };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WarehouseController(
      mockService as any,
      mockStorageService as any,
    );
  });

  it('creates a warehouse with an uploaded image key', async () => {
    mockStorageService.uploadSingleFile.mockResolvedValue({
      key: 'warehouse-img',
    });

    await controller.addWarehouse(
      { name: 'Warehouse' } as any,
      { originalname: 'warehouse.png' } as any,
      { user } as any,
    );

    expect(mockService.addWarehouse).toHaveBeenCalledWith(
      { name: 'Warehouse' },
      'warehouse-img',
      user,
    );
  });

  it('passes parsed analytics filters to health comparison', () => {
    controller.getWarehouseHealthComparison(
      { days: '30', startDate: '2024-01-01', endDate: '2024-01-31' } as any,
      { user } as any,
    );

    expect(mockService.getWarehouseHealthComparison).toHaveBeenCalledWith(
      {
        days: 30,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      },
      user,
    );
  });

  it('updates a warehouse without an uploaded file', async () => {
    await controller.updateWarehouse(
      'warehouse-1',
      { name: 'Updated' } as any,
      { user } as any,
      undefined as any,
    );

    expect(mockService.updateWarehouse).toHaveBeenCalledWith(
      'warehouse-1',
      { name: 'Updated' },
      null,
      user,
    );
  });
});
