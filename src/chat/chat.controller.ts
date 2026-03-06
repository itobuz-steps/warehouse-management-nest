import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import type { UserDocument } from 'src/auth/entities/auth.entity';

interface AuthRequest extends Request {
  userId?: string;
  user?: UserDocument;
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * SSE streaming endpoint — ChatGPT-style.
   * Returns text/event-stream with token-by-token delivery.
   */
  @Post('stream')
  @ApiOperation({
    summary: 'Send a chat message and receive a streaming SSE response',
  })
  @ApiBody({ type: ChatMessageDto })
  async streamChat(
    @Body() dto: ChatMessageDto,
    @Req() req: AuthRequest,
    @Res() res: Response,
  ) {
    try {
      const { result, sessionId } = await this.chatService.streamChat(
        req.userId!,
        dto.message,
        req.user!,
        dto.sessionId,
        dto.warehouseId,
        dto.model,
      );

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Session-Id', sessionId);
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.flushHeaders();

      // Get the text stream response and pipe it
      const streamResponse = result.toTextStreamResponse();
      const reader = streamResponse.body?.getReader();

      if (!reader) {
        res
          .status(500)
          .json({ success: false, message: 'No stream available' });
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Write raw chunk (for curl/fetch clients that read raw stream)
        res.write(chunk);
      }
      res.end();
    } catch (error) {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Stream failed',
        });
      } else {
        res.end();
      }
    }
  }

  /**
   * Non-streaming endpoint — returns full response as JSON.
   */
  @Post('message')
  @ApiOperation({
    summary: 'Send a chat message and receive a complete JSON response',
  })
  @ApiBody({ type: ChatMessageDto })
  @ApiResponse({
    status: 200,
    description: 'Full chat response with text, session ID',
  })
  async sendMessage(@Body() dto: ChatMessageDto, @Req() req: AuthRequest) {
    return this.chatService.generateChat(
      req.userId!,
      dto.message,
      req.user!,
      dto.sessionId,
      dto.warehouseId,
      dto.model,
    );
  }

  /**
   * List all chat sessions for the authenticated user.
   */
  @Get('models')
  @ApiOperation({
    summary:
      'List available Ollama models. Use the returned model IDs in the stream/message payload.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of available models with their IDs',
  })
  async getModels() {
    return this.chatService.getModels();
  }

  /**
   * List the authenticated user's chat sessions.
   */
  @Get('sessions')
  @ApiOperation({ summary: 'List all chat sessions for the current user' })
  async getSessions(@Req() req: AuthRequest) {
    return this.chatService.getSessions(req.userId!);
  }

  /**
   * Get full conversation history for a session.
   */
  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get conversation history for a session' })
  async getSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthRequest,
  ) {
    return this.chatService.getSession(req.userId!, sessionId);
  }

  /**
   * Delete a chat session.
   */
  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Delete a chat session' })
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthRequest,
  ) {
    return this.chatService.deleteSession(req.userId!, sessionId);
  }
}
