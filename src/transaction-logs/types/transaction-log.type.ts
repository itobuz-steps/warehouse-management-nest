import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';
import { SHIPMENT_TYPES } from 'src/transaction/constants/shipmentConstants';

export type LogUserSnapshot = {
  userId: string;
  name: string;
  email: string;
};

export type LogWarehouseSnapshot = {
  warehouseId: string;
  name: string;
};

export type TransactionLogItem = {
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  quantity: number;
};

export type BaseTransactionLog = {
  logType: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_TRANSFER' | 'STOCK_ADJUST';
  transactionId: string;
  transactionType: TRANSACTION_TYPES;
  performedBy: LogUserSnapshot;
  createdAt: Date;
};

export type StockInLog = BaseTransactionLog & {
  logType: 'STOCK_IN';
  supplier: {
    supplierId: string;
    name: string;
    email?: string;
  };
  destinationWarehouse: LogWarehouseSnapshot;
  products: TransactionLogItem[];
};

export type StockOutLog = BaseTransactionLog & {
  logType: 'STOCK_OUT';
  customer: {
    customerId: string;
    name: string;
    email: string;
  };
  sourceWarehouse: LogWarehouseSnapshot;
  shipmentStatus: SHIPMENT_TYPES;
  products: TransactionLogItem[];
};

export type ShipmentStatusChangeLog = BaseTransactionLog & {
  shipment: {
    previousStatus: string;
    newStatus: string;
  };
  warehouse?: {
    warehouseId: string;
    name: string;
  };
  customer?: {
    customerId: string;
    name: string;
    email?: string;
  };
  items: TransactionLogItem[];
};

export type StockTransferLog = BaseTransactionLog & {
  logType: 'STOCK_TRANSFER';
  sourceWarehouse: LogWarehouseSnapshot;
  destinationWarehouse: LogWarehouseSnapshot;
  products: TransactionLogItem[];
};

export type StockAdjustLog = BaseTransactionLog & {
  logType: 'STOCK_ADJUST';
  warehouse: LogWarehouseSnapshot;
  reason: string;
  products: TransactionLogItem[];
};
