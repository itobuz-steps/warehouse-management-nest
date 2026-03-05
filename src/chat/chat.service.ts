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

const SYSTEM_PROMPT = `You are an intelligent warehouse management assistant. You have access to a real-time warehouse management system with tools to query products, inventory, transactions, suppliers, customers, warehouses, analytics, and dashboard data.

RULES:
1. ALWAYS use tools to fetch real data before answering data-related questions. NEVER make up numbers or data.
2. Respond in a human, analyst-like style:
  - Start with a short plain-language summary of what happened.
  - Explain key changes or patterns and, when relevant, mention when they happened (today, last 7 days, selected date range, etc.).
  - Highlight important outliers or concerns (e.g., "no shipments today", "purchases much higher than sales").
3. When the user asks for data, decide the best presentation format:
  - Use TEXT + concise bullets by default.
  - Use TABLES for itemized lists (products, transactions, suppliers, etc.).
  - Use CHARTS for trends/comparisons/distributions.
  - Use single METRICS for KPI values.
4. You can call MULTIPLE tools in sequence to answer complex questions.
5. If a query requires a warehouse ID and the user hasn't specified one, first call get_warehouses to list available ones, then ask which warehouse they mean, or use the warehouse from the conversation context.
6. For charts, include a JSON block in your response with this format:
   \`\`\`chart
   {"chartType":"bar|line|pie|doughnut|area","title":"...","labels":["..."],"datasets":[{"label":"...","data":[...]}]}
   \`\`\`
7. For tables, include a JSON block:
   \`\`\`table
   {"title":"...","columns":[{"key":"name","label":"Name","type":"string"}],"rows":[{"name":"..."}]}
   \`\`\`
8. For metric values, include:
   \`\`\`metric
   {"label":"Total Revenue","value":"$45,230","change":"+12%","icon":"trending-up"}
   \`\`\`
9. Be concise but thorough. Explain what the data means, not just what the numbers are.
10. The current date is ${new Date().toISOString().split('T')[0]}.
11. When tasks involve summing, averaging, counting, or aggregating data, USE the tools to get raw data, then compute the result yourself.
12. NEVER output raw tool-call JSON such as {"name":"...","arguments":{...}} in the final answer. Call tools through function-calling and then return user-facing results.
13. Do NOT reply with only raw JSON payloads. Provide user-facing narrative text first, and include table/chart/metric blocks only when they help readability.
14. NEVER mention internal steps like "I will call function...", "Please wait while I process", or "Here is the JSON for function call". Return only final user-facing content.
15. NEVER use placeholder examples like "Product A/B/C" unless those exact names exist in tool results. If no records exist, explicitly say no records were found.`;

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
    const normalizedBaseUrl = normalizeOllamaBaseUrl(config.OLLAMA_BASE_URL);

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
    this.logStage('stream.request.received', {
      userId,
      sessionId: sessionId ?? null,
      warehouseId: warehouseId ?? null,
      messagePreview: this.preview(message, 180),
    });

    const session = await this.getOrCreateSession(
      userId,
      sessionId,
      warehouseId,
    );

    this.logStage('stream.session.ready', {
      sessionId: session._id.toString(),
      existingMessages: session.messages.length,
    });

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

    this.logStage('stream.session.user_message_saved', {
      sessionId: session._id.toString(),
      totalMessages: session.messages.length,
    });

    const history = this.sessionToMessages(session);
    const tools = this.buildTools(user);

    const contextInfo = warehouseId
      ? `\nThe user is currently viewing warehouse ID: ${warehouseId}.`
      : '';
    const roleInfo = `\nThe user's role is: ${user.role || 'admin'}. Their name is: ${user.name || 'User'}.`;

    this.logStage('stream.model.call_start', {
      sessionId: session._id.toString(),
      historyMessages: history.length,
      toolCount: Object.keys(tools).length,
      model: config.OLLAMA_MODEL || 'llama3.1:8b',
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
    });

    const result = streamText({
      model: this.model,
      system: SYSTEM_PROMPT + contextInfo + roleInfo,
      messages: [...history],
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(5),
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
      experimental_onToolCallStart: ({ stepNumber, toolCall }) => {
        this.logStage('stream.tool_call.start', {
          sessionId: session._id.toString(),
          stepNumber,
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: toolCall.input,
        });
      },
      onFinish: async ({ text }) => {
        this.logStage('stream.model.finish', {
          sessionId: session._id.toString(),
          responsePreview: this.preview(text),
          responseLength: text.length,
        });

        const pseudoToolCall = this.extractPseudoToolCall(text);
        if (pseudoToolCall) {
          this.logStage(
            'stream.model.pseudo_tool_call_detected',
            {
              sessionId: session._id.toString(),
              pseudoToolCall,
            },
            'warn',
          );
        }

        // Persist assistant response
        session.messages.push({
          role: 'assistant',
          content: text,
          timestamp: new Date(),
        } as ChatMessage);
        await session.save();

        this.logStage('stream.session.assistant_message_saved', {
          sessionId: session._id.toString(),
          totalMessages: session.messages.length,
        });
      },
      onError: ({ error }) => {
        this.logStage(
          'stream.model.error',
          {
            sessionId: session._id.toString(),
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
          sessionId: session._id.toString(),
          stepNumber,
          finishReason,
          textPreview: this.preview(text, 260),
          toolCalls: this.summarizeToolCalls(toolCalls),
          toolResults: this.summarizeToolResults(toolResults),
        });
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
    this.logStage('generate.request.received', {
      userId,
      sessionId: sessionId ?? null,
      warehouseId: warehouseId ?? null,
      messagePreview: this.preview(message, 180),
    });

    const session = await this.getOrCreateSession(
      userId,
      sessionId,
      warehouseId,
    );

    this.logStage('generate.session.ready', {
      sessionId: session._id.toString(),
      existingMessages: session.messages.length,
    });

    if (session.messages.length === 0) {
      session.title = message.slice(0, 60);
    }

    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    } as ChatMessage);
    await session.save();

    this.logStage('generate.session.user_message_saved', {
      sessionId: session._id.toString(),
      totalMessages: session.messages.length,
    });

    const history = this.sessionToMessages(session);
    const tools = this.buildTools(user);

    const contextInfo = warehouseId
      ? `\nThe user is currently viewing warehouse ID: ${warehouseId}.`
      : '';
    const roleInfo = `\nThe user's role is: ${user.role || 'admin'}. Their name is: ${user.name || 'User'}.`;

    this.logStage('generate.model.call_start', {
      sessionId: session._id.toString(),
      historyMessages: history.length,
      toolCount: Object.keys(tools).length,
      model: config.OLLAMA_MODEL || 'llama3.1:8b',
      temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
    });

    let text: string;
    try {
      const result = await generateText({
        model: this.model,
        system: SYSTEM_PROMPT + contextInfo + roleInfo,
        messages: [...history],
        tools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(5),
        temperature: Number(config.OLLAMA_TEMPERATURE) || 0.1,
        experimental_onToolCallStart: ({ stepNumber, toolCall }) => {
          this.logStage('generate.tool_call.start', {
            sessionId: session._id.toString(),
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
            sessionId: session._id.toString(),
            stepNumber,
            finishReason,
            textPreview: this.preview(stepText, 260),
            toolCalls: this.summarizeToolCalls(toolCalls),
            toolResults: this.summarizeToolResults(toolResults),
          });
        },
        onFinish: ({ text: finalText, finishReason, usage }) => {
          this.logStage('generate.model.finish', {
            sessionId: session._id.toString(),
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
          sessionId: session._id.toString(),
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
      throw error;
    }

    const fallbackMarkdown = await this.buildFallbackMarkdownFromPseudoToolCall(
      session._id.toString(),
      text,
      tools as unknown as ExecutableToolSet,
    );

    const finalReply = this.sanitizeAssistantReply(fallbackMarkdown ?? text);

    session.messages.push({
      role: 'assistant',
      content: finalReply,
      timestamp: new Date(),
    } as ChatMessage);
    await session.save();

    this.logStage('generate.session.assistant_message_saved', {
      sessionId: session._id.toString(),
      totalMessages: session.messages.length,
    });

    return {
      success: true,
      message: 'Chat response generated',
      data: {
        reply: finalReply,
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
