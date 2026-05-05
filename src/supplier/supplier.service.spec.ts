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
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SupplierService } from './supplier.service';
import { Supplier } from './entities/supplier.entity';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { createMockModel } from 'src/common/test/test-utils';

describe('SupplierService', () => {
  let service: SupplierService;
  const mockSupplierModel = createMockModel();
  const mockTransactionModel = createMockModel();
  const mockLogsService = { createLog: jest.fn() };

  const mockUser = {
    _id: new Types.ObjectId().toHexString(),
    name: 'Supplier User',
    email: 'supplier@example.com',
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierService,
        { provide: getModelToken(Supplier.name), useValue: mockSupplierModel },
        {
          provide: getModelToken(Transaction.name),
          useValue: mockTransactionModel,
        },
        { provide: TransactionLogsService, useValue: mockLogsService },
      ],
    }).compile();

    service = module.get<SupplierService>(SupplierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws when a supplier already exists', async () => {
      mockSupplierModel.findOne.mockResolvedValue({} as any);

      await expect(
        service.create({ email: 'exists@example.com' } as any, mockUser),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a new supplier and logs action', async () => {
      const supplier = {
        _id: new Types.ObjectId(),
        email: 'new@example.com',
        name: 'New Supplier',
        phoneNumber: '1234567890',
        address: '789 Supplier St',
        suppliedProduct: ['Category'],
        isActive: true,
      } as any;

      mockSupplierModel.findOne.mockResolvedValue(null);
      mockSupplierModel.create.mockResolvedValue(supplier);

      const result = await service.create(
        { email: 'new@example.com' } as any,
        mockUser,
      );

      expect(result).toBe(supplier);
      expect(mockSupplierModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
      expect(mockLogsService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
          entityType: expect.any(String),
          entityId: supplier._id.toHexString(),
          performedBy: mockUser,
        }),
      );
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when supplier is missing', async () => {
      mockSupplierModel.findById.mockResolvedValue(null);

      await expect(service.delete('missing-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes supplier and logs action', async () => {
      const supplier = {
        _id: new Types.ObjectId(),
        name: 'Delete Supplier',
        email: 'delete@example.com',
        isActive: true,
      } as any;

      mockSupplierModel.findById.mockReturnValue(mockSupplierModel);
      mockSupplierModel.exec.mockResolvedValueOnce(supplier);
      mockSupplierModel.findByIdAndUpdate.mockResolvedValue(supplier);

      const result = await service.delete(supplier._id.toHexString(), mockUser);

      expect(result).toBe(supplier);
      expect(mockLogsService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.any(String),
          entityType: expect.any(String),
          entityId: supplier._id.toHexString(),
          performedBy: mockUser,
        }),
      );
    });
  });

  describe('getAll', () => {
    it('returns supplier results when search is provided', async () => {
      const supplier = { email: 'search@example.com' };
      mockSupplierModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([supplier]),
      } as any);

      const result = await service.getAll('search');

      expect(mockSupplierModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
        { __v: 0 },
      );
      expect(result).toEqual([supplier]);
    });
  });
});
