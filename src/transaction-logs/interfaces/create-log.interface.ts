import { LogAction } from '../enums/log-action.enum';
import { LogEntityType } from '../enums/log-entity-type.enum';
import { LogStatus } from '../enums/log-status.enum';
import type { LogMetadata } from '../types/log-metadata.type';

export interface CreateTransactionLogInput {
  action: LogAction;
  entityType: LogEntityType;
  entityId: string;

  performedBy: {
    userId: string;
    email: string;
    role: string;
  };

  metadata: LogMetadata;
  status?: LogStatus;
}
