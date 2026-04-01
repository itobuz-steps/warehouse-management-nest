export enum NOTIFICATION_TYPES {
  LOW_STOCK = 'lowStock',
  PENDING_SHIPMENT = 'pendingShipment',
  STOCK_IN = 'stockIn',
  STOCK_TRANSFER = 'stockTransfer',
  STOCK_ADJUSTMENT = 'stockAdjustment',
}

export type ProfileImageResult = {
  performedByImageKey?: string;
  performedByImage?: string;
};
