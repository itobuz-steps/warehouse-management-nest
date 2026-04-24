import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Types } from 'mongoose';

// Mock the AuthGuard to avoid transitive auth setup.
jest.mock('src/common/guard/auth.guard', () => ({
  AuthGuard: class MockAuthGuard {
    canActivate() {
      return true;
    }
  },
}));

// Replace ChatService import with a lightweight class token.
jest.mock('./chat.service', () => ({
  ChatService: class MockChatService {},
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
    headersSent: false,
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res;
};

function createReadableResponse(chunks: string[]): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
  );
}

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService = {
    streamChat: jest.fn(),
    generateChat: jest.fn(),
    getModels: jest.fn(),
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
    it('sets SSE headers and forwards chunks to the response', async () => {
      mockChatService.streamChat.mockResolvedValue({
        result: {
          toTextStreamResponse: () =>
            createReadableResponse(['hello', ' world']),
        },
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
        undefined,
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream',
      );
      expect(res.setHeader).toHaveBeenCalledWith('X-Session-Id', mockSessionId);
      expect(res.flushHeaders).toHaveBeenCalled();
      expect(res.write).toHaveBeenCalledWith('hello');
      expect(res.write).toHaveBeenCalledWith(' world');
      expect(res.end).toHaveBeenCalled();
    });

    it('returns json error when stream body is missing', async () => {
      mockChatService.streamChat.mockResolvedValue({
        result: {
          toTextStreamResponse: () => new Response(null),
        },
        sessionId: mockSessionId,
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await controller.streamChat(
        { message: 'hi' } as never,
        req as never,
        res as never,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No stream available',
      });
    });
  });

  describe('sendMessage', () => {
    it('returns generated chat response', async () => {
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
        undefined,
      );
    });
  });

  describe('session APIs', () => {
    it('returns user sessions', async () => {
      const sessions = {
        success: true,
        message: 'Chat sessions retrieved',
        data: [{ _id: mockSessionId, title: 'Chat 1' }],
      };
      mockChatService.getSessions.mockResolvedValue(sessions);

      const result = await controller.getSessions(createMockRequest() as never);

      expect(result).toEqual(sessions);
      expect(mockChatService.getSessions).toHaveBeenCalledWith(mockUserId);
    });

    it('returns single session', async () => {
      const payload = { success: true, data: { _id: mockSessionId } };
      mockChatService.getSession.mockResolvedValue(payload);

      const result = await controller.getSession(
        mockSessionId,
        createMockRequest() as never,
      );

      expect(result).toEqual(payload);
      expect(mockChatService.getSession).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
      );
    });

    it('deletes a session', async () => {
      const payload = { success: true, message: 'Session deleted', data: null };
      mockChatService.deleteSession.mockResolvedValue(payload);

      const result = await controller.deleteSession(
        mockSessionId,
        createMockRequest() as never,
      );

      expect(result).toEqual(payload);
      expect(mockChatService.deleteSession).toHaveBeenCalledWith(
        mockUserId,
        mockSessionId,
      );
    });
  });
});
