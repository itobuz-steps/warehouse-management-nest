import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
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

// Mock ESM modules that Jest can't parse
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));
jest.mock('@aws-sdk/client-s3', () => ({}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({}));

// Mock auth entity to prevent Mongoose decorator resolution error for User.role
jest.mock('src/auth/entities/auth.entity', () => {
  class User {
    name?: string;
    email: string;
    role: string;
    isVerified: boolean;
    isActive: boolean;
    isDeleted: boolean;
  }
  return { User, UserDocument: User };
});

// Mock all dependent service modules with explicit factories to prevent transitive Mongoose decorator errors
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

// Mock AI SDK modules
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => {
    const modelFn = jest.fn(() => 'mock-model');
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

const mockUserId = new Types.ObjectId().toString();
const mockSessionId = new Types.ObjectId().toString();
const mockWarehouseId = new Types.ObjectId().toString();

const mockUser = {
  _id: mockUserId,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  isVerified: true,
  isActive: true,
  isDeleted: false,
} as unknown as import('src/auth/entities/auth.entity').UserDocument;

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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatSession.name),
          useValue: mockChatSessionModel,
        },
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
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('streamChat', () => {
    it('should create a new session when no sessionId is provided', async () => {
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

    it('should reuse existing session when sessionId is provided', async () => {
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

    it('should set session title from first message', async () => {
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

    it('should push user message to session and save', async () => {
      const session = createMockSession();
      mockChatSessionModel.create.mockResolvedValue(session);

      await service.streamChat(mockUserId, 'Test message', mockUser);

      expect(session.messages).toHaveLength(1);
      expect(session.messages[0]).toMatchObject({
        role: 'user',
        content: 'Test message',
      });
      expect(session.save).toHaveBeenCalled();
    });

    it('should return a result with pipeTextStreamToResponse', async () => {
      const session = createMockSession();
      mockChatSessionModel.create.mockResolvedValue(session);

      const { result } = await service.streamChat(
        mockUserId,
        'Hello',
        mockUser,
      );

      expect(result).toBeDefined();
      expect(typeof result.pipeTextStreamToResponse).toBe('function');
    });

    it('should include warehouseId in session context when provided', async () => {
      const session = createMockSession();
      mockChatSessionModel.create.mockResolvedValue(session);

      await service.streamChat(
        mockUserId,
        'Show warehouse stock',
        mockUser,
        undefined,
        mockWarehouseId,
      );

      expect(mockChatSessionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          warehouseContext: new Types.ObjectId(mockWarehouseId),
        }),
      );
    });

    it('should create new session when provided sessionId is not found', async () => {
      const session = createMockSession();
      mockChatSessionModel.findOne.mockResolvedValue(null);
      mockChatSessionModel.create.mockResolvedValue(session);

      await service.streamChat(mockUserId, 'Hello', mockUser, 'nonexistent-id');

      expect(mockChatSessionModel.create).toHaveBeenCalled();
    });
  });

  describe('generateChat', () => {
    it('should return structured response with reply and sessionId', async () => {
      const session = createMockSession();
      mockChatSessionModel.create.mockResolvedValue(session);

      const response = await service.generateChat(
        mockUserId,
        'What is total stock?',
        mockUser,
      );

      expect(response).toEqual({
        success: true,
        message: 'Chat response generated',
        data: {
          reply: 'Mock generated response',
          sessionId: mockSessionId,
        },
      });
    });

    it('should save both user and assistant messages', async () => {
      const session = createMockSession();
      mockChatSessionModel.create.mockResolvedValue(session);

      await service.generateChat(mockUserId, 'Test query', mockUser);

      // User message + assistant message
      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toMatchObject({
        role: 'user',
        content: 'Test query',
      });
      expect(session.messages[1]).toMatchObject({
        role: 'assistant',
        content: 'Mock generated response',
      });
      // save called twice: once for user msg, once for assistant msg
      expect(session.save).toHaveBeenCalledTimes(2);
    });

    it('should set title from first message on a new session', async () => {
      const session = createMockSession({ messages: [] });
      mockChatSessionModel.create.mockResolvedValue(session);

      await service.generateChat(
        mockUserId,
        'A very long first message that should be truncated to exactly sixty characters maximum',
        mockUser,
      );

      expect(session.title).toBe(
        'A very long first message that should be truncated to exactl',
      );
    });

    it('should reuse existing session when valid sessionId is given', async () => {
      const existingMessages = [
        { role: 'user', content: 'Prev question', timestamp: new Date() },
        { role: 'assistant', content: 'Prev answer', timestamp: new Date() },
      ];
      const session = createMockSession({
        messages: existingMessages as never[],
      });
      mockChatSessionModel.findOne.mockResolvedValue(session);

      await service.generateChat(
        mockUserId,
        'Follow up',
        mockUser,
        mockSessionId,
      );

      expect(mockChatSessionModel.findOne).toHaveBeenCalledWith({
        _id: mockSessionId,
        userId: new Types.ObjectId(mockUserId),
      });
      // 2 previous + 1 user + 1 assistant = 4
      expect(session.messages).toHaveLength(4);
    });
  });

  describe('getSessions', () => {
    it('should return sessions for a user', async () => {
      const mockSessions = [
        { _id: mockSessionId, title: 'Chat 1', createdAt: new Date() },
      ];
      mockChatSessionModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockSessions),
          }),
        }),
      });

      const result = await service.getSessions(mockUserId);

      expect(result).toEqual({
        success: true,
        message: 'Chat sessions retrieved',
        data: mockSessions,
      });
      expect(mockChatSessionModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(mockUserId),
      });
    });

    it('should return empty array when user has no sessions', async () => {
      mockChatSessionModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getSessions(mockUserId);

      expect(result.data).toEqual([]);
      expect(result.success).toBe(true);
    });
  });

  describe('getSession', () => {
    it('should return a session with conversation history', async () => {
      const mockSession = {
        _id: mockSessionId,
        title: 'Chat 1',
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
        ],
      };
      mockChatSessionModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockSession),
      });

      const result = await service.getSession(mockUserId, mockSessionId);

      expect(result).toEqual({
        success: true,
        message: 'Session retrieved',
        data: mockSession,
      });
    });

    it('should return not found when session does not exist', async () => {
      mockChatSessionModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getSession(mockUserId, 'nonexistent');

      expect(result).toEqual({
        success: false,
        message: 'Session not found',
        data: null,
      });
    });
  });

  describe('deleteSession', () => {
    it('should delete a session and return success', async () => {
      mockChatSessionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.deleteSession(mockUserId, mockSessionId);

      expect(result).toEqual({
        success: true,
        message: 'Session deleted',
        data: null,
      });
      expect(mockChatSessionModel.deleteOne).toHaveBeenCalledWith({
        _id: mockSessionId,
        userId: new Types.ObjectId(mockUserId),
      });
    });

    it('should return failure when session is not found', async () => {
      mockChatSessionModel.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const result = await service.deleteSession(mockUserId, 'nonexistent');

      expect(result).toEqual({
        success: false,
        message: 'Session not found',
        data: null,
      });
    });
  });
});
