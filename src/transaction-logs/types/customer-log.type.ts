export interface CustomerCreateLog {
  name?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
}

export interface CustomerUpdateLog {
  oldValue: Partial<CustomerCreateLog>;
  newValue: Partial<CustomerCreateLog>;
}

export interface CustomerDeleteLog {
  name?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
}
