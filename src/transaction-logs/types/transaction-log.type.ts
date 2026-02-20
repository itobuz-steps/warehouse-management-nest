// src/transaction-logs/types/transaction-log.types.ts
export interface TransactionCreateLog {
  transactionType: string; // TRANSACTION_TYPES
  productId: string;
  quantity: number;

  shipment?: string; // SHIPMENT_TYPES
  supplier?: string;
  customerEmail?: string;

  sourceWarehouse?: string;
  destinationWarehouse?: string;
}

export interface TransactionCancelLog {
  reason: string;
}

export interface StockAdjustLog {
  previousQuantity: number;
  adjustedQuantity: number;
  difference: number;
}
