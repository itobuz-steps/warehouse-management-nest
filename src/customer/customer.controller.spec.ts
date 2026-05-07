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
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';

jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {
    canActivate() {
      return true;
    }
  },
}));

describe('CustomerController', () => {
  let controller: CustomerController;
  const mockCustomerService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAnalytics: jest.fn(),
    getStatusCounts: jest.fn(),
  };

  const mockUser = {
    _id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [{ provide: CustomerService, useValue: mockCustomerService }],
    }).compile();

    controller = module.get<CustomerController>(CustomerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a customer', async () => {
    mockCustomerService.create.mockResolvedValue({ id: 'c1' });

    const response = await controller.create(
      { name: 'Test' } as any,
      { user: mockUser } as any,
    );

    expect(response).toEqual({
      message: 'Customer created successfully',
      success: true,
      data: { id: 'c1' },
    });
    expect(mockCustomerService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test' }),
      mockUser,
    );
  });

  it('returns all customers', async () => {
    const payload = [{ name: 'A' }];
    mockCustomerService.findAll.mockResolvedValue(payload);

    const response = await controller.findAll('search');

    expect(response).toEqual({
      message: 'All customers retrieved successfully',
      success: true,
      data: payload,
    });
    expect(mockCustomerService.findAll).toHaveBeenCalledWith('search');
  });

  it('returns paginated customers with parsed numeric params', async () => {
    const payload = { data: [{ name: 'A' }], total: 1 };
    mockCustomerService.findAllPaginated.mockResolvedValue(payload);

    const response = await controller.findAllPaginated(
      'search',
      '2' as any,
      '5' as any,
      'true',
    );

    expect(response).toEqual({
      message: 'All customers retrieved successfully',
      success: true,
      data: payload,
    });
    expect(mockCustomerService.findAllPaginated).toHaveBeenCalledWith(
      'search',
      2,
      5,
      'true',
    );
  });

  it('returns single customer details', async () => {
    const customer = { id: 'c1' };
    mockCustomerService.findOne.mockResolvedValue(customer);

    const response = await controller.findOne('c1');

    expect(response).toEqual({
      message: 'Specific Customer retrieved successfully',
      success: true,
      data: customer,
    });
    expect(mockCustomerService.findOne).toHaveBeenCalledWith('c1');
  });

  it('updates a customer', async () => {
    const updated = { id: 'c2' };
    mockCustomerService.update.mockResolvedValue(updated);

    const response = await controller.update(
      'c2',
      { name: 'Updated' } as any,
      { user: mockUser } as any,
    );

    expect(response).toEqual({
      message: 'Customer updated successfully',
      success: true,
      data: updated,
    });
    expect(mockCustomerService.update).toHaveBeenCalledWith(
      'c2',
      expect.objectContaining({ name: 'Updated' }),
      mockUser,
    );
  });

  it('removes a customer', async () => {
    mockCustomerService.remove.mockResolvedValue({ id: 'c3' });

    const response = await controller.remove('c3', { user: mockUser } as any);

    expect(response).toEqual({
      message: 'Customer removed successfully',
      success: true,
      data: { id: 'c3' },
    });
    expect(mockCustomerService.remove).toHaveBeenCalledWith('c3', mockUser);
  });

  it('delegates analytics lookups', () => {
    controller.getAnalytics();

    expect(mockCustomerService.getAnalytics).toHaveBeenCalled();
  });

  it('delegates status count lookups', () => {
    controller.getStatusCounts();

    expect(mockCustomerService.getStatusCounts).toHaveBeenCalled();
  });
});
