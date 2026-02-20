// src/transaction-logs/schemas/transaction-log.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { LogAction } from '../enums/log-action.enum';
import { LogEntityType } from '../enums/log-entity-type.enum';
import { LogStatus } from '../enums/log-status.enum';
import type { PerformedBy } from '../types/performed-by.type';
import type { LogMetadata } from '../types/log-metadata.type';

export type TransactionLogDocument = HydratedDocument<TransactionLog>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
})
export class TransactionLog {
  @Prop({ required: true, enum: Object.values(LogAction) })
  action: LogAction;

  @Prop({ required: true, enum: Object.values(LogEntityType) })
  entityType: LogEntityType;

  @Prop({ required: true })
  entityId: string;

  @Prop({
    type: {
      userId: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
    },
    required: true,
  })
  performedBy: PerformedBy;

  @Prop({ type: Object, required: true })
  metadata: LogMetadata;

  @Prop({ enum: Object.values(LogStatus), default: LogStatus.SUCCESS })
  status: LogStatus;

  createdAt: Date;
}

export const TransactionLogSchema =
  SchemaFactory.createForClass(TransactionLog);
