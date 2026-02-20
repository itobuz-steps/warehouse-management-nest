// src/transaction-logs/types/log-metadata-map.ts
import { LogAction } from '../enums/log-action.enum';
import { CustomerCreateLog, CustomerUpdateLog } from './customer-log.type';

export interface LogMetadataMap {
  [LogAction.CUSTOMER_CREATED]: CustomerCreateLog;
  [LogAction.CUSTOMER_UPDATED]: CustomerUpdateLog;
  [LogAction.CUSTOMER_DELETED]: {
    email: string;
  };
}
