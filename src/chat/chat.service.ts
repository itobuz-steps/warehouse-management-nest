import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText, stepCountIs, type ModelMessage } from 'ai';
import { config } from 'src/config/config.service';
import {
  ChatSession,
  ChatMessage,
  ChatSessionDocument,
} from './entities/chat-session.entity';
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
import type { UserDocument } from 'src/auth/entities/auth.entity';

interface ChatStreamResult {
  pipeTextStreamToResponse(
    response: { write: (data: string) => boolean; end: () => void },
    init?: ResponseInit,
  ): void;
}

import { createProductTools } from './tools/product.tools';
import { createInventoryTools } from './tools/inventory.tools';
import { createTransactionTools } from './tools/transaction.tools';
import { createDashboardTools } from './tools/dashboard.tools';
import { createAnalyticsTools } from './tools/analytics.tools';
import { createEntityTools } from './tools/entity.tools';

const SYSTEM_PROMPT = `You are an intelligent warehouse management assistant. You have access to a real-time warehouse management system with tools to query products, inventory, transactions, suppliers, customers, warehouses, analytics, and dashboard data.

RULES:
1. ALWAYS use tools to fetch real data before answering data-related questions. NEVER make up numbers or data.
2. When the user asks for data, decide the best presentation format:
   - Use TABLES for lists of items (products, transactions, suppliers, etc.)
   - Use CHARTS for trends, comparisons, distributions (include chart specification in your response)
   - Use single METRICS for KPI values (e.g., "Total Stock: 4,520")
   - Use TEXT for explanations, summaries, and general answers
3. You can call MULTIPLE tools in sequence to answer complex questions.
4. If a query requires a warehouse ID and the user hasn't specified one, first call get_warehouses to list available ones, then ask which warehouse they mean, or use the warehouse from the conversation context.
5. For charts, include a JSON block in your response with this format:
   \`\`\`chart
   {"chartType":"bar|line|pie|doughnut|area","title":"...","labels":["..."],"datasets":[{"label":"...","data":[...]}]}
   \`\`\`
6. For tables, include a JSON block:
   \`\`\`table
   {"title":"...","columns":[{"key":"name","label":"Name","type":"string"}],"rows":[{"name":"..."}]}
   \`\`\`
7. For metric values, include:
   \`\`\`metric
   {"label":"Total Revenue","value":"$45,230","change":"+12%","icon":"trending-up"}
   \`\`\`
8. Be concise but thorough. Explain what the data shows.
9. The current date is ${new Date().toISOString().split('T')[0]}.
10. When tasks involve summing, averaging, counting, or aggregating data, USE the tools to get raw data, then compute the result yourself.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai: ReturnType<typeof createOpenAI>;
  private readonly model: ReturnType<ReturnType<typeof createOpenAI>>;

  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    private readonly productsService: ProductsService,
    private readonly quantityService: QuantityService,
    private readonly transactionService: TransactionService,
    private readonly dashboardService: DashboardService,
    private readonly analyticsService: AnalyticsService,
    private readonly warehouseService: WarehouseService,
    private readonly supplierService: SupplierService,
    private readonly customerService: CustomerService,
    private readonly batchService: BatchService,
    private readonly adminService: AdminService,
    private readonly transactionLogsService: TransactionLogsService,
  ) {
    this.openai = createOpenAI({
      baseURL: config.OLLAMA_BASE_URL,
      apiKey: 'ollama', // Ollama ignores the API key but the SDK requires one
    });
    this.model = this.openai(config.OLLAMA_MODEL || 'qwen2.5-coder:14b');
  }

  private buildTools(user: UserDocument) {
    const getUserContext = (): UserDocument => user;
    return {
      ...createProductTools(this.productsService),
      ...createInventoryTools(this.quantityService),
      ...createTransactionTools(this.transactionService, getUserContext),
      ...createDashboardTools(this.dashboardService),
      ...createAnalyticsTools(this.analyticsService),
      ...createEntityTools(
        this.warehouseService,
        this.supplierService,
        this.customerService,
        this.batchService,
        this.adminService,
        this.transactionLogsService,
        getUserContext,
      ),
    };
  }

  private async getOrCreateSession(
    userId: string,
    sessionId?: string,
    warehouseId?: string,
  ): Promise<ChatSessionDocument> {
    if (sessionId) {
      const session = await this.chatSessionModel.findOne({
        _id: sessionId,
        userId: new Types.ObjectId(userId),
      });
      if (session) return session;
    }

    const session = await this.chatSessionModel.create({
      userId: new Types.ObjectId(userId),
      title: 'New Chat',
      warehouseContext: warehouseId
        ? new Types.ObjectId(warehouseId)
        : undefined,
      messages: [],
    });
    return session;
  }

  private sessionToMessages(session: ChatSessionDocument): ModelMessage[] {
    return session.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20) // Keep last 20 messages for context window
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  /**
   * Streaming endpoint — returns the AI SDK streamText result.
   * The controller pipes this to SSE via pipeTextStreamToResponse().
   */
  async streamChat(
    userId: string,
    message: string,
    user: UserDocument,
    sessionId?: string,
    warehouseId?: string,
  ): Promise<{
    result: ChatStreamResult;
    sessionId: string;
  }> {
    const session = await this.getOrCreateSession(
      userId,
      sessionId,
      warehouseId,
    );

    // Update title from first message
    if (session.messages.length === 0) {
      session.title = message.slice(0, 60);
    }

    // Save user message
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    } as ChatMessage);
    await session.save();

    const history = this.sessionToMessages(session);
    const tools = this.buildTools(user);

    const contextInfo = warehouseId
      ? `\nThe user is currently viewing warehouse ID: ${warehouseId}.`
      : '';
    const roleInfo = `\nThe user's role is: ${user.role || 'admin'}. Their name is: ${user.name || 'User'}.`;

    const result = streamText({
      model: this.model,
      system: SYSTEM_PROMPT + contextInfo + roleInfo,
      messages: [...history],
      tools,
      stopWhen: stepCountIs(5),
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
      onFinish: async ({ text }) => {
        // Persist assistant response
        session.messages.push({
          role: 'assistant',
          content: text,
          timestamp: new Date(),
        } as ChatMessage);
        await session.save();
      },
      onError: ({ error }) => {
        this.logger.error('Stream error:', error);
      },
      onStepFinish: ({ toolResults }) => {
        if (toolResults?.length) {
          this.logger.debug(
            `Tool results: ${toolResults.map((t) => t.toolName).join(', ')}`,
          );
        }
      },
    });

    return { result, sessionId: session._id.toString() };
  }

  /**
   * Non-streaming endpoint — returns full text response.
   */
  async generateChat(
    userId: string,
    message: string,
    user: UserDocument,
    sessionId?: string,
    warehouseId?: string,
  ) {
    const session = await this.getOrCreateSession(
      userId,
      sessionId,
      warehouseId,
    );

    if (session.messages.length === 0) {
      session.title = message.slice(0, 60);
    }

    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    } as ChatMessage);
    await session.save();

    const history = this.sessionToMessages(session);
    const tools = this.buildTools(user);

    const contextInfo = warehouseId
      ? `\nThe user is currently viewing warehouse ID: ${warehouseId}.`
      : '';
    const roleInfo = `\nThe user's role is: ${user.role || 'admin'}. Their name is: ${user.name || 'User'}.`;

    const { text } = await generateText({
      model: this.model,
      system: SYSTEM_PROMPT + contextInfo + roleInfo,
      messages: [...history],
      tools,
      stopWhen: stepCountIs(5),
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
    });

    session.messages.push({
      role: 'assistant',
      content: text,
      timestamp: new Date(),
    } as ChatMessage);
    await session.save();

    return {
      success: true,
      message: 'Chat response generated',
      data: {
        reply: text,
        sessionId: session._id.toString(),
      },
    };
  }

  /**
   * Get user's chat sessions list
   */
  async getSessions(userId: string) {
    const sessions = await this.chatSessionModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('title warehouseContext createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    return {
      success: true,
      message: 'Chat sessions retrieved',
      data: sessions,
    };
  }

  /**
   * Get full conversation history for a session
   */
  async getSession(userId: string, sessionId: string) {
    const session = await this.chatSessionModel
      .findOne({
        _id: sessionId,
        userId: new Types.ObjectId(userId),
      })
      .lean();

    if (!session) {
      return {
        success: false,
        message: 'Session not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Session retrieved',
      data: session,
    };
  }

  /**
   * Delete a chat session
   */
  async deleteSession(userId: string, sessionId: string) {
    const result = await this.chatSessionModel.deleteOne({
      _id: sessionId,
      userId: new Types.ObjectId(userId),
    });

    return {
      success: result.deletedCount > 0,
      message:
        result.deletedCount > 0 ? 'Session deleted' : 'Session not found',
      data: null,
    };
  }
}
