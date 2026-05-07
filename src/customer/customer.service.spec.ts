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
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CustomerService } from './customer.service';
import { Customer } from './entities/customer.entity';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { createMockModel } from 'src/common/test/test-utils';

describe('CustomerService', () => {
  let service: CustomerService;
  const mockCustomerModel = createMockModel();
  const mockTransactionModel = createMockModel();
  const mockLogsService = { createLog: jest.fn() };

  const mockUser = {
    _id: new Types.ObjectId().toHexString(),
    name: 'Test User',
    email: 'test@example.com',
    isActive: true,
    isDeleted: false,
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        { provide: TransactionLogsService, useValue: mockLogsService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a customer and logs creation', async () => {
      const customer = {
        _id: new Types.ObjectId(),
        name: 'Acme Corp',
        email: 'acme@example.com',
        phoneNumber: '1234567890',
        address: '123 Test Lane',
        isActive: true,
      } as any;

      mockCustomerModel.create.mockResolvedValue(customer);

      const result = await service.create(
        { name: 'Acme Corp', email: 'acme@example.com' } as any,
        mockUser,
      );

      expect(result).toBe(customer);
      expect(mockCustomerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'acme@example.com' }),
      );
      expect(mockLogsService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
          entityType: expect.any(String),
          entityId: customer._id.toHexString(),
          performedBy: mockUser,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('returns all customers when query is not provided', async () => {
      const customer = { name: 'Acme', email: 'acme@example.com' };
      mockCustomerModel.find.mockReturnValue(mockCustomerModel);
      mockCustomerModel.sort.mockReturnValue(mockCustomerModel);
      mockCustomerModel.exec.mockResolvedValue([customer]);

      const result = await service.findAll();

      expect(mockCustomerModel.find).toHaveBeenCalledWith({});
      expect(mockCustomerModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual([customer]);
    });
  });

  describe('findAllPaginated', () => {
    it('returns paginated customer results', async () => {
      const customer = { name: 'Paginated', email: 'page@example.com' };
      mockCustomerModel.countDocuments.mockResolvedValue(1);
      mockCustomerModel.find.mockReturnValue(mockCustomerModel);
      mockCustomerModel.sort.mockReturnValue(mockCustomerModel);
      mockCustomerModel.skip.mockReturnValue(mockCustomerModel);
      mockCustomerModel.limit.mockReturnValue(mockCustomerModel);
      mockCustomerModel.exec.mockResolvedValue([customer]);

      const result = await service.findAllPaginated('test', 1, 10, 'true');

      expect(mockCustomerModel.countDocuments).toHaveBeenCalledWith({
        isActive: true,
        $or: expect.any(Array),
      });
      expect(result).toEqual({
        data: [customer],
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when customer is missing', async () => {
      mockCustomerModel.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-id', { name: 'Updated' } as any, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates a customer and logs update', async () => {
      const existingCustomer = {
        _id: new Types.ObjectId(),
        name: 'Old Name',
        email: 'old@example.com',
        phoneNumber: '1111111111',
        address: 'Old Address',
        isActive: true,
      } as any;
      const updatedCustomer = {
        ...existingCustomer,
        name: 'New Name',
      };

      mockCustomerModel.findOne.mockResolvedValueOnce(existingCustomer);
      mockCustomerModel.findByIdAndUpdate.mockResolvedValue(updatedCustomer);

      const result = await service.update(
        existingCustomer._id.toHexString(),
        { name: 'New Name' } as any,
        mockUser,
      );

      expect(result).toBe(updatedCustomer);
      expect(mockLogsService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
          entityType: expect.any(String),
          entityId: existingCustomer._id.toHexString(),
          performedBy: mockUser,
          metadata: expect.objectContaining({
            oldValue: expect.objectContaining({
              name: 'Old Name',
            }),
            newValue: expect.objectContaining({
              name: 'New Name',
            }),
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when deletion target does not exist', async () => {
      mockCustomerModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.remove('missing-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('soft deletes customer and logs deletion', async () => {
      const deleted = {
        _id: new Types.ObjectId(),
        name: 'Deleted',
        email: 'deleted@test.com',
      };

      mockCustomerModel.findByIdAndUpdate.mockResolvedValue(deleted);

      const result = await service.remove(deleted._id.toHexString(), mockUser);

      expect(result).toEqual(deleted);

      expect(mockLogsService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: deleted._id.toHexString(),
          performedBy: mockUser,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns active customer', async () => {
      const customer = { _id: 'c1', isActive: true };

      mockCustomerModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(customer),
      });

      const result = await service.findOne('c1');

      expect(result).toEqual(customer);
      expect(mockCustomerModel.findOne).toHaveBeenCalledWith({
        _id: 'c1',
        isActive: true,
      });
    });
  });
});
