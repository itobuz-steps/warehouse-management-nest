import { Types } from 'mongoose';
import { Product } from 'src/products/entities/product.entity';

export type TopProductItem = {
  productId: Types.ObjectId;
  productName: string;
  category: string;
  price: number;
  totalQuantity: number;
};

export type InventoryByCategoryAggItem = {
  _id: string;
  totalProducts: number;
  products: Product[];
};

export type ProductTransactionDay = {
  _id: string;
  IN: number;
  OUT: number;
};

export type LowStockProduct = {
  productId: Types.ObjectId;
  quantity: number;
  productName: string;
};

export type TopSellingProduct = {
  productId: Types.ObjectId;
  productName: string;
  category: string;
  price: number;
  totalSoldQuantity: number;
  totalSalesAmount: number;
  productImage?: string;
};

export type ProfitLossItem = {
  label: string;
  profit: number;
  loss: number;
  net: number;
};

export type SalesOverview = {
  totalSalesAmount: number;
  totalTransactions: number;
};

export type PurchaseOverview = {
  totalPurchaseAmount: number;
  totalTransactions: number;
};

export type InventoryOverview = {
  totalQuantity: number;
};

export type TodayShipmentOverview = {
  quantity: number;
};
