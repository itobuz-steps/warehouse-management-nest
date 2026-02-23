export type TransactionCreateLog = {
  transactionType: string; // TRANSACTION_TYPES
  productId: string;
  quantity: number;

  shipment?: string; // SHIPMENT_TYPES
  supplier?: string;
  customerEmail?: string;

  sourceWarehouse?: string;
  destinationWarehouse?: string;
};

export type TransactionCancelLog = {
  reason: string;
};

export type StockAdjustLog = {
  previousQuantity: number;
  adjustedQuantity: number;
  difference: number;
};
