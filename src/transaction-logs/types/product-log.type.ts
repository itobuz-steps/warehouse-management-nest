// src/transaction-logs/types/product-log.types.ts
export interface ProductCreateLog {
  name: string;
  category: string;
  brand: string;
  label: string;
  price: number;
}

export interface ProductUpdateLog {
  oldValue: Partial<ProductCreateLog>;
  newValue: Partial<ProductCreateLog>;
}

export interface ProductArchiveLog {
  isArchived: boolean;
}
