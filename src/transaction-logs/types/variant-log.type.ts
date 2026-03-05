import { Types } from 'mongoose';

export type VariantCreateLog = {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  price: number;
  markup: number;
  attributes: Record<string, string>;
  variantImage: string[];
};
