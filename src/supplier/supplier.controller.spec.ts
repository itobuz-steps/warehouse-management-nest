jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: jest.fn().mockImplementation(() => ({
    createLog: jest.fn(),
  })),
}));

jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class {},
  TransactionSchema: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {
    canActivate() {
      return true;
    }
  },
}));

describe('SupplierController', () => {
  let controller: SupplierController;

  const mockSupplierService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    getAllPaginated: jest.fn(),
    getSpecificSupplier: jest.fn(),
    getAnalytics: jest.fn(),
  };

  const mockUser = { _id: 'user-id', name: 'Test Supplier' } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [{ provide: SupplierService, useValue: mockSupplierService }],
    }).compile();

    controller = module.get<SupplierController>(SupplierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('adds a new supplier', async () => {
    mockSupplierService.create.mockResolvedValue({ id: 's1' });

    const response = await controller.addSupplier(
      { name: 'Supplier' } as any,
      { user: mockUser } as any,
    );

    expect(response).toEqual({
      success: true,
      message: 'supplier created successfully',
      data: { id: 's1' },
    });
    expect(mockSupplierService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Supplier' }),
      mockUser,
    );
  });

  it('returns all suppliers', async () => {
    const suppliers = [{ id: 's1' }];
    mockSupplierService.getAll.mockResolvedValue(suppliers);

    const response = await controller.getAll('search');

    expect(response).toEqual({
      success: true,
      message: 'Suppliers Data fetched',
      data: suppliers,
    });
    expect(mockSupplierService.getAll).toHaveBeenCalledWith('search');
  });

  it('removes a supplier', async () => {
    mockSupplierService.delete.mockResolvedValue(undefined);

    const response = await controller.removeSupplier('s1', {
      user: mockUser,
    } as any);

    expect(response).toEqual({
      message: 'Supplier deleted successfully',
      success: true,
    });
    expect(mockSupplierService.delete).toHaveBeenCalledWith('s1', mockUser);
  });

  it('updates a supplier', async () => {
    mockSupplierService.update.mockResolvedValue({ id: 's1', name: 'Updated' });

    const response = await controller.updateSupplier(
      's1',
      { name: 'Updated' } as any,
      { user: mockUser } as any,
    );

    expect(response).toEqual({
      success: true,
      message: 'Updated Supplier successfully',
      data: { id: 's1', name: 'Updated' },
    });

    expect(mockSupplierService.update).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ name: 'Updated' }),
      mockUser,
    );
  });

  it('returns paginated suppliers', async () => {
    const paginated = {
      data: [{ id: 's1' }],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    mockSupplierService.getAllPaginated.mockResolvedValue(paginated);

    const response = await controller.getAllPaginated('search', 1, 10, 'true');

    expect(response).toEqual({
      success: true,
      message: 'Suppliers Data fetched',
      data: paginated,
    });

    expect(mockSupplierService.getAllPaginated).toHaveBeenCalledWith(
      'search',
      1,
      10,
      'true',
    );
  });

  it('returns a specific supplier', async () => {
    const supplier = { id: 's1' };

    mockSupplierService.getSpecificSupplier.mockResolvedValue(supplier);

    const response = await controller.getSpecificSupplier('s1');

    expect(response).toEqual({
      message: 'Specific Supplier',
      success: true,
      data: supplier,
    });

    expect(mockSupplierService.getSpecificSupplier).toHaveBeenCalledWith('s1');
  });

  it('returns supplier analytics', async () => {
    const analytics = {
      success: true,
      message: 'Supplier analytics retrieved successfully',
      data: {},
    };

    mockSupplierService.getAnalytics.mockResolvedValue(analytics);

    await expect(controller.getAnalytics()).resolves.toEqual(analytics);

    expect(mockSupplierService.getAnalytics).toHaveBeenCalled();
  });
});
