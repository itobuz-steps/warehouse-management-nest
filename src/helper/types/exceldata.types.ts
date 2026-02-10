// For Product Analytics

import mongoose from 'mongoose';

export type TwoProductTransactionExcelRow = {
  date: string;
  productATransactions: number;
  productBTransactions: number;
};

export type TwoProductHistoryResult = {
  warehouse: string;
  productA: {
    id: string;
    name: string;
    history: TransactionHistoryItem[];
  };
  productB: {
    id: string;
    name: string;
    history: TransactionHistoryItem[];
  };
};

export type TransactionHistoryItem = {
  date: string;
  transactions: number;
};

export type TwoProductQuantityResult = {
  warehouse: string;
  productA: {
    id: string;
    name: string;
    quantity: number;
  };
  productB: {
    id: string;
    name: string;
    quantity: number;
  };
};

// For Dashboard Analytics

export type TopProductExcelItem = {
  productId: mongoose.Types.ObjectId;
  productName: string;
  category: string;
  price: number;
  totalQuantity: number;
};

export type InventoryCategoryExcelItem = {
  _id: string;
  totalProducts: number;
  products: { price: number }[];
};

export type WeeklyTransactionExcelItem = {
  _id: string;
  IN: number;
  OUT: number;
};
