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
});
