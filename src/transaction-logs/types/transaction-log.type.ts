import { SHIPMENT_TYPES } from 'src/transaction/constants/shipmentConstants';

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

export type StockInLog = {
  supplier: {
    supplierId: string;
    name: string;
    email?: string;
  };
  destinationWarehouse: LogWarehouseSnapshot;
  products: TransactionLogItem[];
};

export type StockOutLog = {
  customer: {
    customerId: string;
    name: string;
    email: string;
  };
  sourceWarehouse: LogWarehouseSnapshot;
  shipmentStatus: SHIPMENT_TYPES;
  products: TransactionLogItem[];
};

export type ShipmentStatusChangeLog = {
  shipment: {
    previousStatus: string;
    newStatus: string;
  };
  warehouse: {
    warehouseId?: string;
    name?: string;
  };
  customer?: {
    customerId?: string;
    name: string;
    email?: string;
  };
  products: TransactionLogItem[];
};

export type StockTransferLog = {
  sourceWarehouse: LogWarehouseSnapshot;
  destinationWarehouse: LogWarehouseSnapshot;
  products: TransactionLogItem[];
};

export type StockAdjustLog = {
  destinationWarehouse: LogWarehouseSnapshot;
  reason: string;
  products: TransactionLogItem[];
};
