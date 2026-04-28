export type BatchDamagedItemLog = {
  variantId: string;
  damagedQuantity: number;
};

export type BatchMarkedDamagedLog = {
  sourceWarehouseId?: string;
  destinationWarehouseName: string;
  destinationWarehouseId: string;
  damageScope: 'FULL_BATCH' | 'SINGLE_VARIANT';
  items: BatchDamagedItemLog[];
};
