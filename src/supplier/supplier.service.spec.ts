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

  describe('update', () => {
    it('throws when supplier does not exist', async () => {
      mockSupplierModel.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-id', {} as any, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates supplier and logs action', async () => {
      const existingSupplier = {
        _id: new Types.ObjectId(),
        name: 'Old',
        email: 'old@example.com',
        phoneNumber: '123',
        address: 'Address',
        suppliedProduct: ['Food'],
        isActive: true,
      };

      const updatedSupplier = {
        ...existingSupplier,
        name: 'Updated',
      };

      mockSupplierModel.findById.mockResolvedValue(existingSupplier);
      mockSupplierModel.findByIdAndUpdate.mockResolvedValue(updatedSupplier);

      const result = await service.update(
        existingSupplier._id.toHexString(),
        { name: 'Updated' } as any,
        mockUser,
      );

      expect(result).toEqual(updatedSupplier);

      expect(mockLogsService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: existingSupplier._id.toHexString(),
          performedBy: mockUser,
        }),
      );
    });

    it('throws when supplier is missing after update', async () => {
      const existingSupplier = {
        _id: new Types.ObjectId(),
      };

      mockSupplierModel.findById.mockResolvedValue(existingSupplier);
      mockSupplierModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.update(existingSupplier._id.toHexString(), {} as any, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllPaginated', () => {
    it('returns paginated supplier data', async () => {
      const suppliers = [{ id: 's1' }];

      mockSupplierModel.countDocuments.mockResolvedValue(1);

      mockSupplierModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(suppliers),
          }),
        }),
      });

      const result = await service.getAllPaginated('search', 1, 10, 'true');

      expect(result).toEqual({
        data: suppliers,
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });
  });

  describe('getSpecificSupplier', () => {
    it('returns a supplier', async () => {
      const supplier = { id: 's1' };

      mockSupplierModel.findOne.mockResolvedValue(supplier);

      const result = await service.getSpecificSupplier(
        new Types.ObjectId().toHexString(),
      );

      expect(result).toEqual(supplier);
    });

    it('throws when supplier is not found', async () => {
      mockSupplierModel.findOne.mockResolvedValue(null);

      await expect(
        service.getSpecificSupplier(new Types.ObjectId().toHexString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('analytics', () => {
    it('returns analytics payload', async () => {
      jest.spyOn(service, 'getStatusCounts').mockResolvedValue({
        total: 10,
        active: 8,
        inactive: 2,
      });

      jest
        .spyOn(service, 'getTopSuppliersByStockSupplied')
        .mockResolvedValue([]);

      jest.spyOn(service, 'getSupplyByCategory').mockResolvedValue([]);

      jest
        .spyOn(service, 'getTopSuppliersByProductVariety')
        .mockResolvedValue([]);

      const result = await service.getAnalytics();

      expect(result).toEqual({
        success: true,
        message: 'Supplier analytics retrieved successfully',
        data: {
          statusCounts: {
            total: 10,
            active: 8,
            inactive: 2,
          },
          topByStock: [],
          categoryBreakdown: [],
          productVariety: [],
        },
      });
    });

    it('returns supplier status counts', async () => {
      mockSupplierModel.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7);

      const result = await service.getStatusCounts();

      expect(result).toEqual({
        total: 10,
        active: 7,
        inactive: 3,
      });
    });

    it('returns top suppliers by stock supplied', async () => {
      const aggregateMock = [{ name: 'Supplier A' }];

      mockTransactionModel.aggregate.mockResolvedValue(aggregateMock);

      const result = await service.getTopSuppliersByStockSupplied();

      expect(result).toEqual(aggregateMock);
    });

    it('returns supply by category', async () => {
      const aggregateMock = [{ category: 'Food', supplierCount: 2 }];

      mockSupplierModel.aggregate.mockResolvedValue(aggregateMock);

      const result = await service.getSupplyByCategory();

      expect(result).toEqual(aggregateMock);
    });

    it('returns top suppliers by product variety', async () => {
      const aggregateMock = [{ name: 'Supplier A', categoryCount: 5 }];

      mockSupplierModel.aggregate.mockResolvedValue(aggregateMock);

      const result = await service.getTopSuppliersByProductVariety();

      expect(result).toEqual(aggregateMock);
    });
  });
});
