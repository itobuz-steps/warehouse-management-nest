import { Types } from 'mongoose';

export type WarehouseManagerSnapshot = {
  userId: Types.ObjectId;
  name: string;
};

export type WarehouseCreateLog = {
  name: string;
  description?: string;
  managers: WarehouseManagerSnapshot[];
  address: string;
  capacity: number;
  active: boolean;
  maxTransactionPriceLimit: number;
};

export type WarehouseUpdateLog = {
  oldValue: Partial<WarehouseCreateLog>;
  newValue: Partial<WarehouseCreateLog>;
};

export type WarehouseDeleteLog = {
  name: string;
  description?: string;
  address: string;
  active: boolean;
  maxTransactionPriceLimit: number;
};
