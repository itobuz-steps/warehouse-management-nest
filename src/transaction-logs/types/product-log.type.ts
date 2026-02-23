export type ProductCreateLog = {
  name: string;
  category: string;
  brand: string;
  label: string;
  description: string;
  productImage: string[];
  price: number;
  markup: number;
  isArchived: boolean;
  variantCount: number;
};

export type ProductUpdateLog = {
  oldValue: Partial<ProductCreateLog>;
  newValue: Partial<ProductCreateLog>;
};

export type ProductArchiveLog = {
  name: string;
  isArchived: boolean;
};
