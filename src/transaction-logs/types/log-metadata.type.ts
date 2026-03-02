import {
  ProductCreateLog,
  ProductUpdateLog,
  ProductArchiveLog,
} from './product-log.type';
import { WarehouseCreateLog, WarehouseUpdateLog } from './warehouse-log.type';
import { SupplierCreateLog, SupplierUpdateLog } from './supplier-log.type';
import { CustomerCreateLog, CustomerUpdateLog } from './customer-log.type';
import {
  StockInLog,
  StockOutLog,
  StockTransferLog,
  StockAdjustLog,
  ShipmentStatusChangeLog,
} from './transaction-log.type';
import { UserStatusChangeLog } from './user-status-log.type';
import { VariantCreateLog } from './variant-log.type';

export type LogMetadata =
  | ProductCreateLog
  | ProductUpdateLog
  | ProductArchiveLog
  | VariantCreateLog
  | WarehouseCreateLog
  | WarehouseUpdateLog
  | SupplierCreateLog
  | SupplierUpdateLog
  | CustomerCreateLog
  | CustomerUpdateLog
  | UserStatusChangeLog
  | StockInLog
  | StockOutLog
  | StockTransferLog
  | StockAdjustLog
  | ShipmentStatusChangeLog;
