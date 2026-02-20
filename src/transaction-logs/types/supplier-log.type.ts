// src/transaction-logs/types/supplier-log.types.ts
export interface SupplierCreateLog {
  name: string;
  email: string;
  suppliedProduct: string[];
}

export interface SupplierUpdateLog {
  oldValue: Partial<SupplierCreateLog>;
  newValue: Partial<SupplierCreateLog>;
}
