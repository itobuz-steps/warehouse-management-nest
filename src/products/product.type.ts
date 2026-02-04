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
