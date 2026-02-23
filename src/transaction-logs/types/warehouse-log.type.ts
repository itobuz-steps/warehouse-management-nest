export type WarehouseCreateLog = {
  name: string;
  address: string;
  capacity: number;
  active: boolean;
};

export type WarehouseUpdateLog = {
  oldValue: Partial<WarehouseCreateLog>;
  newValue: Partial<WarehouseCreateLog>;
};
