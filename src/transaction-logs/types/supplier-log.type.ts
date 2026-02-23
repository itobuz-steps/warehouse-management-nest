export type SupplierCreateLog = {
  name: string;
  email: string;
  suppliedProduct: string[];
  address: string;
  phoneNumber: string;
};

export type SupplierUpdateLog = {
  oldValue: Partial<SupplierCreateLog>;
  newValue: Partial<SupplierCreateLog>;
};

export type SupplierDeleteLog = {
  name?: string;
  email?: string;
  address?: string;
  phoneNumber?: string;
  suppliedProduct?: string[];
};
