export type CustomerCreateLog = {
  name?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
};

export type CustomerUpdateLog = {
  oldValue: Partial<CustomerCreateLog>;
  newValue: Partial<CustomerCreateLog>;
};

export type CustomerDeleteLog = {
  name?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
};
