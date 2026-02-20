// src/transaction-logs/types/warehouse-log.types.ts
export interface WarehouseCreateLog {
  name: string;
  address: string;
  capacity: number;
  active: boolean;
}

export interface WarehouseUpdateLog {
  oldValue: Partial<WarehouseCreateLog>;
  newValue: Partial<WarehouseCreateLog>;
}
