import { IsNotEmpty, IsOptional, IsString, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ description: 'The user message / prompt' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Session ID for continuing a conversation',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Warehouse context for scoped queries' })
  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @ApiPropertyOptional({
    description:
      'Ollama model to use (e.g. qwen2.5-coder:14b). Falls back to the server default if omitted or invalid.',
  })
  @IsOptional()
  @IsString()
  model?: string;
}
