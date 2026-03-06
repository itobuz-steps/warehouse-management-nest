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

interface StreamPart {
  type: string;
  textDelta?: string;
}

interface ChatStreamResult {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<StreamPart>;
  toTextStreamResponse: () => Response;
}

type ExecutableTool = {
  execute?: (input: unknown) => Promise<unknown>;
};

type ExecutableToolSet = Record<string, ExecutableTool>;

import { createProductTools } from './tools/product.tools';
import { createInventoryTools } from './tools/inventory.tools';
import { createTransactionTools } from './tools/transaction.tools';
import { createDashboardTools } from './tools/dashboard.tools';
import { createAnalyticsTools } from './tools/analytics.tools';
import { createEntityTools } from './tools/entity.tools';
import { createQueryTools, type QueryModelMap } from './tools/query.tools';
import { parseChatResponse } from './chat-response.parser';
import { SYSTEM_PROMPT } from './chat.prompt';
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

const SYSTEM_PROMPT_DATE_SUFFIX = `

--------------------------------
TODAY'S DATE
--------------------------------

${new Date().toISOString().split('T')[0]}
`;

function normalizeOllamaBaseUrl(baseUrl?: string): string {
  const fallback = 'https://llm-server-1.wordpress-studio.io/v1';
  if (!baseUrl) return fallback;

  const trimmed = baseUrl.trim().replace(/\/$/, '');

  if (trimmed.endsWith('/v1')) {
    return trimmed;
  }

  if (trimmed.endsWith('/api/v1')) {
    return trimmed.replace(/\/api\/v1$/, '/v1');
  }

  if (trimmed.endsWith('/api')) {
    return trimmed.replace(/\/api$/, '/v1');
  }

  if (trimmed.match(/\/v\d+$/)) {
    return trimmed.replace(/\/v\d+$/, '/v1');
  }

  if (!trimmed.endsWith('/v1')) {
    return `${trimmed}/v1`;
  }

  return trimmed;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai: ReturnType<typeof createOpenAI>;
  private readonly model: ReturnType<ReturnType<typeof createOpenAI>['chat']>;
  private readonly queryModelMap: QueryModelMap;

  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(Product.name) private productModel: Model<unknown>,
    @InjectModel(Quantity.name) private quantityModel: Model<unknown>,
    @InjectModel(Warehouse.name) private warehouseModel: Model<unknown>,
    @InjectModel(Transaction.name) private transactionModel: Model<unknown>,
    @InjectModel(Variant.name) private variantModel: Model<unknown>,
    @InjectModel(VariantStock.name) private variantStockModel: Model<unknown>,
    @InjectModel(Supplier.name) private supplierModel: Model<unknown>,
    @InjectModel(Customer.name) private customerModel: Model<unknown>,
    @InjectModel(Batch.name) private batchModel: Model<unknown>,
    @InjectModel(TransactionLog.name)
    private transactionLogModel: Model<unknown>,
    @InjectModel(User.name) private userModel: Model<unknown>,
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
    this.queryModelMap = {
      products: this.productModel,
      quantities: this.quantityModel,
      warehouses: this.warehouseModel,
      transactions: this.transactionModel,
      variants: this.variantModel,
      variantstocks: this.variantStockModel,
      suppliers: this.supplierModel,
      customers: this.customerModel,
      batches: this.batchModel,
      transactionlogs: this.transactionLogModel,
      users: this.userModel,
    };

    const rawBaseUrl = (config as unknown as Record<string, unknown>)[
      'OLLAMA_BASE_URL'
    ];
    const normalizedBaseUrl = normalizeOllamaBaseUrl(
      typeof rawBaseUrl === 'string' ? rawBaseUrl : undefined,
    );

    this.openai = createOpenAI({
      baseURL: normalizedBaseUrl,
      apiKey: 'ollama',
    });
    this.model = this.openai.chat(
      (config.OLLAMA_MODEL || 'llama3.1:8b') as Parameters<
        ReturnType<typeof createOpenAI>['chat']
      >[0],
    );

    this.logStage('bootstrap', {
      model: config.OLLAMA_MODEL || 'llama3.1:8b',
      baseUrl: normalizedBaseUrl,
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
    });
  }

  /**
   * Builds the full system prompt with user context
   */
  private buildFullSystemPrompt(
    warehouseId?: string,
    user?: UserDocument,
  ): string {
    const contextInfo = warehouseId
      ? `\nThe user is currently viewing warehouse ID: ${warehouseId}.`
      : '';
    const roleInfo = `\nThe user's role is: ${user?.role || 'admin'}. Their name is: ${user?.name || 'User'}.`;
    return SYSTEM_PROMPT + SYSTEM_PROMPT_DATE_SUFFIX + contextInfo + roleInfo;
  }

  /**
   * Prepares session and saves user message - shared between stream and generate
   */
  private async prepareSession(
    userId: string,
    message: string,
    sessionId?: string,
    warehouseId?: string,
  ): Promise<ChatSessionDocument> {
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

    return session;
  }

  /**
   * Persists assistant response to session
   */
  private async saveAssistantResponse(
    session: ChatSessionDocument,
    text: string,
  ): Promise<string> {
    const normalizedReply = this.normalizeEscapedAssistantReply(text);
    const finalReply = this.sanitizeAssistantReply(normalizedReply);

    session.messages.push({
      role: 'assistant',
      content: finalReply,
      timestamp: new Date(),
    } as ChatMessage);
    await session.save();

    return finalReply;
  }

  private toLog(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return '[unserializable-payload]';
    }
  }

  private preview(text: string, maxLength = 600): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...[truncated]`;
  }

  private normalizeEscapedAssistantReply(text: string): string {
    const trimmed = text.trim();
    let normalized = trimmed;

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed === 'string') {
          normalized = parsed;
        }
      } catch {
        normalized = trimmed;
      }
    }

    const likelyEscaped =
      normalized.includes('\\n') ||
      normalized.includes('\\r\\n') ||
      normalized.includes('\\t') ||
      normalized.includes('\\"') ||
      normalized.includes('\\`');

    if (!likelyEscaped) {
      return normalized;
    }

    return normalized
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\`/g, '`');
  }

  private sanitizeAssistantReply(text: string): string {
    const lines = text.split('\n');
    const sanitizedLines: string[] = [];
    let skipJsonBlock = false;

    for (const line of lines) {
      const normalized = line.trim().toLowerCase();

      if (
        normalized.startsWith('to answer your question, i will call') ||
        normalized.startsWith('here is the json for the function call') ||
        normalized.startsWith('please wait while i process this request') ||
        normalized.startsWith('the result of `') ||
        normalized.startsWith('the result of get_') ||
        normalized.startsWith('the result of')
      ) {
        continue;
      }

      if (!skipJsonBlock && line.trim() === '```json') {
        skipJsonBlock = true;
        continue;
      }

      if (skipJsonBlock) {
        if (line.trim() === '```') {
          skipJsonBlock = false;
        }
        continue;
      }

      if (
        normalized.includes('"name"') &&
        normalized.includes('get_') &&
        normalized.includes('"parameters"')
      ) {
        continue;
      }

      sanitizedLines.push(line);
    }

    const sanitized = sanitizedLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return sanitized || text;
  }

  normalizeAssistantOutput(text: string): string {
    return this.sanitizeAssistantReply(
      this.normalizeEscapedAssistantReply(text),
    );
  }

  private logStage(
    stage: string,
    payload: Record<string, unknown>,
    level: 'log' | 'debug' | 'warn' | 'error' = 'debug',
  ): void {
    this.logger[level](`[chat.${stage}] ${this.toLog(payload)}`);
  }

  private summarizeToolCalls(
    toolCalls: ReadonlyArray<{ toolName: string; input: unknown }> | undefined,
  ) {
    if (!toolCalls?.length) return [];
    return toolCalls.map((toolCall) => ({
      toolName: toolCall.toolName,
      input: toolCall.input,
    }));
  }

  private summarizeToolResults(
    toolResults:
      | ReadonlyArray<{ toolName: string; output: unknown; input: unknown }>
      | undefined,
  ) {
    if (!toolResults?.length) return [];
    return toolResults.map((toolResult) => ({
      toolName: toolResult.toolName,
      input: toolResult.input,
      output: toolResult.output,
    }));
  }

  private extractPseudoToolCall(text: string): {
    name: string;
    arguments: unknown;
  } | null {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenceMatch?.[1] ?? text).trim();

    if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
      return null;
    }

    try {
      const parsed = JSON.parse(candidate) as {
        name?: unknown;
        arguments?: unknown;
      };

      if (typeof parsed.name === 'string' && 'arguments' in parsed) {
        return {
          name: parsed.name,
          arguments: parsed.arguments,
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  private async buildFallbackMarkdownFromPseudoToolCall(
    sessionId: string,
    text: string,
    tools: ExecutableToolSet,
  ): Promise<string | null> {
    const pseudoToolCall = this.extractPseudoToolCall(text);
    if (!pseudoToolCall) {
      return null;
    }

    this.logStage(
      'fallback.pseudo_tool_call.detected',
      {
        sessionId,
        pseudoToolCall,
      },
      'warn',
    );

    const selectedTool = tools[pseudoToolCall.name];
    if (!selectedTool?.execute) {
      this.logStage(
        'fallback.pseudo_tool_call.tool_missing',
        {
          sessionId,
          toolName: pseudoToolCall.name,
        },
        'warn',
      );
      return null;
    }

    try {
      const toolOutput = await selectedTool.execute(pseudoToolCall.arguments);

      this.logStage('fallback.pseudo_tool_call.tool_executed', {
        sessionId,
        toolName: pseudoToolCall.name,
        input: pseudoToolCall.arguments,
        output: toolOutput,
      });

      return [
        `### ${pseudoToolCall.name}`,
        '',
        '```json',
        JSON.stringify(toolOutput, null, 2),
        '```',
      ].join('\n');
    } catch (error) {
      this.logStage(
        'fallback.pseudo_tool_call.tool_execution_error',
        {
          sessionId,
          toolName: pseudoToolCall.name,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : { detail: this.toLog(error) },
        },
        'error',
      );
      return null;
    }
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
      ...createQueryTools(this.queryModelMap),
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
        content:
          m.role === 'assistant'
            ? this.sanitizeAssistantReply(
                this.normalizeEscapedAssistantReply(m.content),
              )
            : m.content,
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
    this.logStage('stream.request.received', {
      userId,
      sessionId: sessionId ?? null,
      warehouseId: warehouseId ?? null,
      messagePreview: this.preview(message, 180),
    });

    const session = await this.prepareSession(
      userId,
      message,
      sessionId,
      warehouseId,
    );
    const sid = session._id.toString();

    this.logStage('stream.session.ready', {
      sessionId: sid,
      totalMessages: session.messages.length,
    });

    const history = this.sessionToMessages(session);
    const tools = this.buildTools(user);
    const systemPrompt = this.buildFullSystemPrompt(warehouseId, user);

    this.logStage('stream.model.call_start', {
      sessionId: sid,
      historyMessages: history.length,
      toolCount: Object.keys(tools).length,
      model: config.OLLAMA_MODEL || 'llama3.1:8b',
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
    });

    const result = streamText({
      model: this.model,
      system: systemPrompt,
      messages: [...history],
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(5),
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
      experimental_onToolCallStart: ({ stepNumber, toolCall }) => {
        this.logStage('stream.tool_call.start', {
          sessionId: sid,
          stepNumber,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: toolCall.input,
        });
      },
      onFinish: async ({ text }) => {
        this.logStage('stream.model.finish', {
          sessionId: sid,
          responsePreview: this.preview(text),
          responseLength: text.length,
        });

        await this.saveAssistantResponse(session, text);

        this.logStage('stream.session.assistant_message_saved', {
          sessionId: sid,
          totalMessages: session.messages.length,
        });
      },
      onError: ({ error }) => {
        this.logStage(
          'stream.model.error',
          {
            sessionId: sid,
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : { detail: this.toLog(error) },
          },
          'error',
        );
      },
      onStepFinish: ({
        stepNumber,
        text,
        finishReason,
        toolCalls,
        toolResults,
      }) => {
        this.logStage('stream.model.step_finish', {
          sessionId: sid,
          stepNumber,
          finishReason,
          textPreview: this.preview(text, 260),
          toolCalls: this.summarizeToolCalls(toolCalls),
          toolResults: this.summarizeToolResults(toolResults),
        });
      },
    });

    return { result, sessionId: sid };
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
    this.logStage('generate.request.received', {
      userId,
      sessionId: sessionId ?? null,
      warehouseId: warehouseId ?? null,
      messagePreview: this.preview(message, 180),
    });

    const session = await this.prepareSession(
      userId,
      message,
      sessionId,
      warehouseId,
    );
    const sid = session._id.toString();

    this.logStage('generate.session.ready', {
      sessionId: sid,
      totalMessages: session.messages.length,
    });

    const history = this.sessionToMessages(session);
    const tools = this.buildTools(user);
    const systemPrompt = this.buildFullSystemPrompt(warehouseId, user);

    this.logStage('generate.model.call_start', {
      sessionId: sid,
      historyMessages: history.length,
      toolCount: Object.keys(tools).length,
      model: config.OLLAMA_MODEL || 'llama3.1:8b',
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
    });

    let text: string;
    try {
      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        messages: [...history],
        tools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(5),
        temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
        experimental_onToolCallStart: ({ stepNumber, toolCall }) => {
          this.logStage('generate.tool_call.start', {
            sessionId: sid,
            stepNumber,
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            input: toolCall.input,
          });
        },
        onStepFinish: ({
          stepNumber,
          text: stepText,
          finishReason,
          toolCalls,
          toolResults,
        }) => {
          this.logStage('generate.model.step_finish', {
            sessionId: sid,
            stepNumber,
            finishReason,
            textPreview: this.preview(stepText, 260),
            toolCalls: this.summarizeToolCalls(toolCalls),
            toolResults: this.summarizeToolResults(toolResults),
          });
        },
        onFinish: ({ text: finalText, finishReason, usage }) => {
          this.logStage('generate.model.finish', {
            sessionId: sid,
            finishReason,
            usage,
            responseLength: finalText.length,
            responsePreview: this.preview(finalText),
          });
        },
      });

      text = result.text;
    } catch (error) {
      this.logStage(
        'generate.model.error',
        {
          sessionId: sid,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : { detail: this.toLog(error) },
        },
        'error',
      );
      throw error;
    }

    const fallbackMarkdown = await this.buildFallbackMarkdownFromPseudoToolCall(
      sid,
      text,
      tools as unknown as ExecutableToolSet,
    );

    const finalReply = this.normalizeAssistantOutput(fallbackMarkdown ?? text);

    session.messages.push({
      role: 'assistant',
      content: finalReply,
      timestamp: new Date(),
    } as ChatMessage);
    await session.save();

    this.logStage('generate.session.assistant_message_saved', {
      sessionId: sid,
      totalMessages: session.messages.length,
    });

    return {
      success: true,
      message: 'Chat response generated',
      data: {
        reply: finalReply,
        parsed: parseChatResponse(finalReply),
        sessionId: sid,
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
