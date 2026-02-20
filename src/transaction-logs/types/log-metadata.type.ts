// src/transaction-logs/types/log-metadata.type.ts
import {
  ProductCreateLog,
  ProductUpdateLog,
  ProductArchiveLog,
} from './product-log.type';
import { WarehouseCreateLog, WarehouseUpdateLog } from './warehouse-log.type';
import { SupplierCreateLog, SupplierUpdateLog } from './supplier-log.type';
import { CustomerCreateLog, CustomerUpdateLog } from './customer-log.type';
import {
  TransactionCreateLog,
  TransactionCancelLog,
  StockAdjustLog,
} from './transaction-log.type';

export type LogMetadata =
  | ProductCreateLog
  | ProductUpdateLog
  | ProductArchiveLog
  | WarehouseCreateLog
  | WarehouseUpdateLog
  | SupplierCreateLog
  | SupplierUpdateLog
  | CustomerCreateLog
  | CustomerUpdateLog
  | TransactionCreateLog
  | TransactionCancelLog
  | StockAdjustLog;
