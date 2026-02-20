// src/transaction-logs/types/log-metadata-map.ts
import { LogAction } from '../enums/log-action.enum';
import {
  CustomerCreateLog,
  CustomerDeleteLog,
  CustomerUpdateLog,
} from './customer-log.type';
import {
  SupplierCreateLog,
  SupplierDeleteLog,
  SupplierUpdateLog,
} from './supplier-log.type';
import { UserStatusChangeLog } from './user-status-log.type';

export interface LogMetadataMap {
  [LogAction.CUSTOMER_CREATED]: CustomerCreateLog;
  [LogAction.CUSTOMER_UPDATED]: CustomerUpdateLog;
  [LogAction.CUSTOMER_DELETED]: CustomerDeleteLog;

  [LogAction.SUPPLIER_CREATED]: SupplierCreateLog;
  [LogAction.SUPPLIER_UPDATED]: SupplierUpdateLog;
  [LogAction.SUPPLIER_DELETED]: SupplierDeleteLog;

  [LogAction.USER_BLOCKED]: UserStatusChangeLog;
  [LogAction.USER_UNBLOCKED]: UserStatusChangeLog;
}
