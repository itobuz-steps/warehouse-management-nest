import { LogAction } from '../enums/log-action.enum';
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
import { UserStatusChangeLog } from './user-status-log.type';
import {
  WarehouseCreateLog,
  WarehouseDeleteLog,
  WarehouseUpdateLog,
} from './warehouse-log.type';

export type LogMetadataMap = {
  [LogAction.CUSTOMER_CREATED]: CustomerCreateLog;
  [LogAction.CUSTOMER_UPDATED]: CustomerUpdateLog;
  [LogAction.CUSTOMER_DELETED]: CustomerDeleteLog;

  [LogAction.SUPPLIER_CREATED]: SupplierCreateLog;
  [LogAction.SUPPLIER_UPDATED]: SupplierUpdateLog;
  [LogAction.SUPPLIER_DELETED]: SupplierDeleteLog;

  [LogAction.USER_BLOCKED]: UserStatusChangeLog;
  [LogAction.USER_UNBLOCKED]: UserStatusChangeLog;

  [LogAction.PRODUCT_CREATED]: ProductCreateLog;
  [LogAction.PRODUCT_UPDATED]: ProductUpdateLog;
  [LogAction.PRODUCT_DELETED]: ProductUpdateLog;
  [LogAction.PRODUCT_ARCHIVED]: ProductArchiveLog;
  [LogAction.PRODUCT_UNARCHIVED]: ProductArchiveLog;

  [LogAction.WAREHOUSE_CREATED]: WarehouseCreateLog;
  [LogAction.WAREHOUSE_UPDATED]: WarehouseUpdateLog;
  [LogAction.WAREHOUSE_DELETED]: WarehouseDeleteLog;
};
