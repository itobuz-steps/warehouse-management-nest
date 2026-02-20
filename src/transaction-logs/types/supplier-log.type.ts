// src/transaction-logs/types/supplier-log.types.ts
export interface SupplierCreateLog {
  name: string;
  email: string;
  suppliedProduct: string[];
  address: string;
  phoneNumber: string;
}

export interface SupplierUpdateLog {
  oldValue: Partial<SupplierCreateLog>;
  newValue: Partial<SupplierCreateLog>;
}

export interface SupplierDeleteLog {
  name?: string;
  email?: string;
  address?: string;
  phoneNumber?: string;
  suppliedProduct?: string[];
}
