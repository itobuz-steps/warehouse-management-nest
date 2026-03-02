import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Types } from 'mongoose';

// Mock the AuthGuard to avoid transitive Mongoose schema resolution
jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {
    canActivate() {
      return true;
    }
  },
}));

// Mock ESM modules that Jest can't parse
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));
jest.mock('@aws-sdk/client-s3', () => ({}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({}));

// Mock auth entity to prevent Mongoose decorator resolution error
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

const mockUserId = new Types.ObjectId().toString();
const mockSessionId = new Types.ObjectId().toString();

const mockUser = {
  _id: mockUserId,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  isVerified: true,
  isActive: true,
};

const createMockRequest = (overrides = {}) => ({
  userId: mockUserId,
  user: mockUser,
  ...overrides,
});

const createMockResponse = () => {
  const res = {
    setHeader: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };
  return res;
};

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService = {
    streamChat: jest.fn(),
    generateChat: jest.fn(),
    getSessions: jest.fn(),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('streamChat', () => {
    it('should set SSE headers and pipe the stream to response', async () => {
      const mockResult = {
        pipeTextStreamToResponse: jest.fn(),
      };
      mockChatService.streamChat.mockResolvedValue({
        result: mockResult,
        sessionId: mockSessionId,
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const dto = { message: 'Hello' };

      await controller.streamChat(dto as never, req as never, res as never);

      expect(mockChatService.streamChat).toHaveBeenCalledWith(
        mockUserId,
        'Hello',
        mockUser,
        undefined,
        undefined,
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(res.setHeader).toHaveBeenCalledWith('X-Session-Id', mockSessionId);
      expect(mockResult.pipeTextStreamToResponse).toHaveBeenCalledWith(res);
    });

    it('should pass sessionId and warehouseId from dto', async () => {
      const warehouseId = new Types.ObjectId().toString();
      const mockResult = { pipeTextStreamToResponse: jest.fn() };
      mockChatService.streamChat.mockResolvedValue({
        result: mockResult,
        sessionId: mockSessionId,
      });

      const req = createMockRequest();
      const res = createMockResponse();
      const dto = {
        message: 'Show stock',
        sessionId: mockSessionId,
        warehouseId,
      };

      await controller.streamChat(dto as never, req as never, res as never);

      expect(mockChatService.streamChat).toHaveBeenCalledWith(
        mockUserId,
        'Show stock',
        mockUser,
        mockSessionId,
        warehouseId,
      );
    });
  });

  describe('sendMessage', () => {
    it('should return generated chat response', async () => {
      const expectedResponse = {
        success: true,
        message: 'Chat response generated',
        data: { reply: 'Here are your products...', sessionId: mockSessionId },
      };
      mockChatService.generateChat.mockResolvedValue(expectedResponse);

      const req = createMockRequest();
      const dto = { message: 'List all products' };

      const result = await controller.sendMessage(dto as never, req as never);

      expect(result).toEqual(expectedResponse);
      expect(mockChatService.generateChat).toHaveBeenCalledWith(
        mockUserId,
        'List all products',
        mockUser,
        undefined,
        undefined,
      );
    });

    it('should forward sessionId and warehouseId', async () => {
      mockChatService.generateChat.mockResolvedValue({ success: true });

      const req = createMockRequest();
      const dto = {
        message: 'Test',
        sessionId: mockSessionId,
        warehouseId: 'wh-123',
      };

      await controller.sendMessage(dto as never, req as never);

      expect(mockChatService.generateChat).toHaveBeenCalledWith(
        mockUserId,
        'Test',
        mockUser,
        mockSessionId,
        'wh-123',
      );
    });
  });

  describe('getSessions', () => {
    it('should return user sessions', async () => {
      const sessions = {
        success: true,
        message: 'Chat sessions retrieved',
        data: [{ _id: mockSessionId, title: 'Chat 1' }],
      };
      mockChatService.getSessions.mockResolvedValue(sessions);

      const req = createMockRequest();
      const result = await controller.getSessions(req as never);

      expect(result).toEqual(sessions);
      expect(mockChatService.getSessions).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('getSession', () => {
    it('should return session details with messages', async () => {
      const session = {
        success: true,
        message: 'Session retrieved',
        data: {
          _id: mockSessionId,
          title: 'Chat 1',
          messages: [
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello!' },
          ],
        },
      };
      mockChatService.getSession.mockResolvedValue(session);

      const req = createMockRequest();
      const result = await controller.getSession(mockSessionId, req as never);

      expect(result).toEqual(session);
      expect(mockChatService.getSession).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
      );
    });

    it('should handle not found session', async () => {
      const notFound = {
        success: false,
        message: 'Session not found',
        data: null,
      };
      mockChatService.getSession.mockResolvedValue(notFound);

      const req = createMockRequest();
      const result = await controller.getSession('nonexistent', req as never);

      expect(result).toEqual(notFound);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session successfully', async () => {
      const deleted = { success: true, message: 'Session deleted', data: null };
      mockChatService.deleteSession.mockResolvedValue(deleted);

      const req = createMockRequest();
      const result = await controller.deleteSession(
        mockSessionId,
        req as never,
      );

      expect(result).toEqual(deleted);
      expect(mockChatService.deleteSession).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
      );
    });

    it('should handle deleting non-existent session', async () => {
      const notFound = {
        success: false,
        message: 'Session not found',
        data: null,
      };
      mockChatService.deleteSession.mockResolvedValue(notFound);

      const req = createMockRequest();
      const result = await controller.deleteSession(
        'nonexistent',
        req as never,
      );

      expect(result).toEqual(notFound);
    });
  });
});
