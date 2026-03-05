import { LogAction } from '../enums/log-action.enum';
import { LOG_ENTITY_TYPE } from '../enums/log-entity-type.enum';
import { LogStatus } from '../enums/log-status.enum';
import type { LogMetadata } from '../types/log-metadata.type';

export type CreateTransactionLogInput = {
  action: LogAction;
  entityType: LOG_ENTITY_TYPE;
  entityId: string;

  performedBy: {
    userId: string;
    email: string;
    role: string;
  };

  metadata: LogMetadata;
  status?: LogStatus;
};
