import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));
jest.mock('@aws-sdk/client-s3', () => ({}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({}));

jest.mock('src/auth/entities/auth.entity', () => {
  class User {}
  return { User, UserDocument: User };
});

jest.mock('src/products/entities/product.entity', () => ({
  Product: class Product {},
}));
jest.mock('src/quantity/entities/quantity.entity', () => ({
  Quantity: class Quantity {},
}));
jest.mock('src/warehouse/schemas/warehouse.schema', () => ({
  Warehouse: class Warehouse {},
}));
jest.mock('src/transaction/schemas/transaction.schema', () => ({
  Transaction: class Transaction {},
}));
jest.mock('src/variant/schemas/variant.schema', () => ({
  Variant: class Variant {},
}));
jest.mock('src/variant-stock/schemas/variant-stock.schema', () => ({
  VariantStock: class VariantStock {},
}));
jest.mock('src/supplier/entities/supplier.entity', () => ({
  Supplier: class Supplier {},
}));
jest.mock('src/customer/entities/customer.entity', () => ({
  Customer: class Customer {},
}));
jest.mock('src/batch/schemas/batch.schema', () => ({ Batch: class Batch {} }));
jest.mock('src/transaction-logs/entities/transaction-log.entity', () => ({
  TransactionLog: class TransactionLog {},
}));

jest.mock('src/products/products.service', () => ({
  ProductsService: jest.fn(),
}));
jest.mock('src/quantity/quantity.service', () => ({
  QuantityService: jest.fn(),
}));
jest.mock('src/transaction/transaction.service', () => ({
  TransactionService: jest.fn(),
}));
jest.mock('src/dashboard/dashboard.service', () => ({
  DashboardService: jest.fn(),
}));
jest.mock('src/analytics/analytics.service', () => ({
  AnalyticsService: jest.fn(),
}));
jest.mock('src/warehouse/warehouse.service', () => ({
  WarehouseService: jest.fn(),
}));
jest.mock('src/supplier/supplier.service', () => ({
  SupplierService: jest.fn(),
}));
jest.mock('src/customer/customer.service', () => ({
  CustomerService: jest.fn(),
}));
jest.mock('src/batch/batch.service', () => ({ BatchService: jest.fn() }));
jest.mock('src/admin/admin.service', () => ({ AdminService: jest.fn() }));
jest.mock('src/transaction-logs/transaction-logs.service', () => ({
  TransactionLogsService: jest.fn(),
}));
jest.mock('src/variant/variant.service', () => ({ VariantService: jest.fn() }));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => {
    const modelFn: any = jest.fn(() => 'mock-model');
    modelFn.chat = jest.fn(() => 'mock-model');
    return modelFn;
  }),
}));

jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    pipeTextStreamToResponse: jest.fn(),
    text: Promise.resolve('Mock streamed response'),
  })),
  generateText: jest.fn(() =>
    Promise.resolve({ text: 'Mock generated response' }),
  ),
  stepCountIs: jest.fn(() => () => false),
  tool: jest.fn((config: Record<string, unknown>) => config),
}));

import { ChatService } from './chat.service';
import { ChatSession } from './entities/chat-session.entity';
import { ProductsService } from 'src/products/products.service';
import { QuantityService } from 'src/quantity/quantity.service';
import { TransactionService } from 'src/transaction/transaction.service';
import { DashboardService } from 'src/dashboard/dashboard.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { WarehouseService } from 'src/warehouse/warehouse.service';
import { SupplierService } from 'src/supplier/supplier.service';
import { CustomerService } from 'src/customer/customer.service';
import { BatchService } from 'src/batch/batch.service';
import { AdminService } from 'src/admin/admin.service';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { VariantService } from 'src/variant/variant.service';
import { Product } from 'src/products/entities/product.entity';
import { Quantity } from 'src/quantity/entities/quantity.entity';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { Variant } from 'src/variant/schemas/variant.schema';
import { VariantStock } from 'src/variant-stock/schemas/variant-stock.schema';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Customer } from 'src/customer/entities/customer.entity';
import { Batch } from 'src/batch/schemas/batch.schema';
import { TransactionLog } from 'src/transaction-logs/entities/transaction-log.entity';
import { User } from 'src/auth/entities/auth.entity';

const mockUserId = new Types.ObjectId().toString();
const mockSessionId = new Types.ObjectId().toString();

const mockUser = {
  _id: mockUserId,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  isVerified: true,
  isActive: true,
  isDeleted: false,
} as any;

const createMockSession = (overrides: Partial<ChatSession> = {}) => ({
  _id: new Types.ObjectId(mockSessionId),
  userId: new Types.ObjectId(mockUserId),
  title: 'New Chat',
  warehouseContext: undefined,
  messages: [],
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('ChatService', () => {
  let service: ChatService;

  const mockChatSessionModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };
  const mockQueryModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockProductsService = {
    getProducts: jest.fn(),
    findOne: jest.fn(),
    findArchived: jest.fn(),
  };
  const mockQuantityService = {
    getTotalQuantity: jest.fn(),
    getSpecificWarehouseQuantity: jest.fn(),
    getProductsHavingQuantity: jest.fn(),
    getWarehouseProducts: jest.fn(),
    findByProduct: jest.fn(),
  };
  const mockTransactionService = {
    getTransactions: jest.fn(),
    getWarehouseTransactions: jest.fn(),
  };
  const mockDashboardService = {
    getTopProducts: jest.fn(),
    getInventoryByCategory: jest.fn(),
    getTransactionActivity: jest.fn(),
    getDashboardStats: jest.fn(),
    getLowStockProducts: jest.fn(),
    getTopSellingProducts: jest.fn(),
    getMostCancelledProducts: jest.fn(),
    getMostAdjustedProducts: jest.fn(),
    getProfitLoss: jest.fn(),
  };
  const mockAnalyticsService = {
    getTwoProductQuantities: jest.fn(),
    getTwoProductComparisonHistory: jest.fn(),
  };
  const mockWarehouseService = {
    getWarehouses: jest.fn(),
    getWarehouseById: jest.fn(),
    getWarehouseCapacity: jest.fn(),
  };
  const mockSupplierService = { getAll: jest.fn() };
  const mockCustomerService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockBatchService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockAdminService = { getManagers: jest.fn() };
  const mockTransactionLogsService = { findAll: jest.fn() };
  const mockVariantService = {
    findById: jest.fn(),
    findByProductId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatSession.name),
          useValue: mockChatSessionModel,
        },
        { provide: getModelToken(Product.name), useValue: mockQueryModel },
        { provide: getModelToken(Quantity.name), useValue: mockQueryModel },
        { provide: getModelToken(Warehouse.name), useValue: mockQueryModel },
        { provide: getModelToken(Transaction.name), useValue: mockQueryModel },
        { provide: getModelToken(Variant.name), useValue: mockQueryModel },
        { provide: getModelToken(VariantStock.name), useValue: mockQueryModel },
        { provide: getModelToken(Supplier.name), useValue: mockQueryModel },
        { provide: getModelToken(Customer.name), useValue: mockQueryModel },
        { provide: getModelToken(Batch.name), useValue: mockQueryModel },
        {
          provide: getModelToken(TransactionLog.name),
          useValue: mockQueryModel,
        },
        { provide: getModelToken(User.name), useValue: mockQueryModel },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: QuantityService, useValue: mockQuantityService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: DashboardService, useValue: mockDashboardService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: WarehouseService, useValue: mockWarehouseService },
        { provide: SupplierService, useValue: mockSupplierService },
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: BatchService, useValue: mockBatchService },
        { provide: AdminService, useValue: mockAdminService },
        {
          provide: TransactionLogsService,
          useValue: mockTransactionLogsService,
        },
        { provide: VariantService, useValue: mockVariantService },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a new session when sessionId is not provided', async () => {
    const session = createMockSession();
    mockChatSessionModel.create.mockResolvedValue(session);

    const { sessionId } = await service.streamChat(
      mockUserId,
      'Hello, show me products',
      mockUser,
    );

    expect(mockChatSessionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Chat',
        messages: [],
      }),
    );
    expect(sessionId).toBe(mockSessionId);
  });

  it('reuses an existing session when sessionId is provided', async () => {
    const session = createMockSession();
    mockChatSessionModel.findOne.mockResolvedValue(session);

    const { sessionId } = await service.streamChat(
      mockUserId,
      'Follow up question',
      mockUser,
      mockSessionId,
    );

    expect(mockChatSessionModel.findOne).toHaveBeenCalledWith({
      _id: mockSessionId,
      userId: new Types.ObjectId(mockUserId),
    });
    expect(sessionId).toBe(mockSessionId);
  });

  it('sets a title from the first user message', async () => {
    const session = createMockSession({ messages: [] });
    mockChatSessionModel.create.mockResolvedValue(session);

    await service.streamChat(
      mockUserId,
      'Show me the top selling products from last month',
      mockUser,
    );

    expect(session.title).toBe(
      'Show me the top selling products from last month',
    );
  });
});
