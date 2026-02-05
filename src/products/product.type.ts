import { Document, Types } from 'mongoose';

import {
  PRODUCT_CATEGORY_TYPES,
  SORT_CATEGORY,
} from './constants/product.constant';

export type ProductParams = {
  id: string;
};

export type GetProductsQuery = {
  search?: string;
  category?: PRODUCT_CATEGORY_TYPES;
  sort?: SORT_CATEGORY;
  page?: string;
  limit?: string;
};

export type UpdateProductBody = {
  name?: string;
  category?: string;
  description?: string;
  price?: number;
  markup?: number;
};

export type CreateProductBody = {
  name: string;
  category?: string;
  description?: string;
  price: number;
  markup?: number;
  createdBy?: string;
};

export type CreateProductParams = Record<string, never>;

export type GetArchivedProductsQuery = {
  search?: string;
  category?: string;
  sort?: SORT_CATEGORY;
  page?: string;
  limit?: string;
};

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  category: string;
  isArchived: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type PaginatedProductsResponse = {
  success: boolean;
  data: {
    products: IProduct[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    productsPerPage: number;
  };
};
