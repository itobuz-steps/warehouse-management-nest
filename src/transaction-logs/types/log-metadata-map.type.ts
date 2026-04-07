import { LOG_ACTION } from '../enums/log-action.enum';
import {
  CustomerCreateLog,
  CustomerDeleteLog,
  CustomerUpdateLog,
} from './customer-log.type';
import {
  ProductArchiveLog,
  ProductCreateLog,
  ProductUpdateLog,
} from './product-log.type';
import {
  SupplierCreateLog,
  SupplierDeleteLog,
  SupplierUpdateLog,
} from './supplier-log.type';
import {
  ShipmentStatusChangeLog,
  StockAdjustLog,
  StockInLog,
  StockOutLog,
  StockTransferLog,
} from './transaction-log.type';
import { UserStatusChangeLog } from './user-status-log.type';
import { VariantCreateLog } from './variant-log.type';
import { BatchMarkedDamagedLog } from './batch-log.type';
import {
  WarehouseCreateLog,
  WarehouseDeleteLog,
  WarehouseUpdateLog,
} from './warehouse-log.type';

export type LogMetadataMap = {
  [LOG_ACTION.CUSTOMER_CREATED]: CustomerCreateLog;
  [LOG_ACTION.CUSTOMER_UPDATED]: CustomerUpdateLog;
  [LOG_ACTION.CUSTOMER_DELETED]: CustomerDeleteLog;

  [LOG_ACTION.SUPPLIER_CREATED]: SupplierCreateLog;
  [LOG_ACTION.SUPPLIER_UPDATED]: SupplierUpdateLog;
  [LOG_ACTION.SUPPLIER_DELETED]: SupplierDeleteLog;

  [LOG_ACTION.USER_BLOCKED]: UserStatusChangeLog;
  [LOG_ACTION.USER_UNBLOCKED]: UserStatusChangeLog;

  [LOG_ACTION.PRODUCT_CREATED]: ProductCreateLog;
  [LOG_ACTION.PRODUCT_UPDATED]: ProductUpdateLog;
  [LOG_ACTION.PRODUCT_ARCHIVED]: ProductArchiveLog;
  [LOG_ACTION.PRODUCT_RESTORED]: ProductArchiveLog;

  [LOG_ACTION.VARIANT_CREATED]: VariantCreateLog;

  [LOG_ACTION.WAREHOUSE_CREATED]: WarehouseCreateLog;
  [LOG_ACTION.WAREHOUSE_UPDATED]: WarehouseUpdateLog;
  [LOG_ACTION.WAREHOUSE_DELETED]: WarehouseDeleteLog;

  [LOG_ACTION.STOCK_IN]: StockInLog;
  [LOG_ACTION.STOCK_OUT]: StockOutLog;
  [LOG_ACTION.STOCK_TRANSFER]: StockTransferLog;
  [LOG_ACTION.STOCK_ADJUSTED]: StockAdjustLog;

  [LOG_ACTION.SHIPMENT_SHIPPED]: ShipmentStatusChangeLog;
  [LOG_ACTION.SHIPMENT_CANCELLED]: ShipmentStatusChangeLog;

  [LOG_ACTION.BATCH_MARKED_DAMAGED]: BatchMarkedDamagedLog;
};
