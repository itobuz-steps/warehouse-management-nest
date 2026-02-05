import { Document, Types } from 'mongoose';

export type ProductParams = {
  id: string;
};

export type GetProductsQuery = {
  search?: string;
  category?: string;
  sort?: 'name_asc' | 'name_desc' | 'category_asc' | 'latest';
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
  sort?: 'name_asc' | 'name_desc' | 'category_asc' | 'latest';
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

export interface PaginatedProductsResponse {
  success: boolean;
  data: {
    products: IProduct[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    productsPerPage: number;
  };
}
