// src/transaction-logs/types/customer-log.types.ts
export interface CustomerCreateLog {
  name: string;
  email: string;
  phoneNumber?: string;
}

export interface CustomerUpdateLog {
  oldValue: Partial<CustomerCreateLog>;
  newValue: Partial<CustomerCreateLog>;
}
