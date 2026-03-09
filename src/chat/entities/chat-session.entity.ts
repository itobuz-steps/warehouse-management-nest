import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true, enum: ['system', 'user', 'assistant', 'tool'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  name?: string;

  @Prop()
  toolCallId?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: 'New Chat' })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  warehouseContext?: Types.ObjectId;

  @Prop({ type: [ChatMessageSchema], default: [] })
  messages: ChatMessage[];
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
