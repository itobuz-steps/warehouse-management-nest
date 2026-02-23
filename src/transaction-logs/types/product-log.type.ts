export type ProductCreateLog = {
  name: string;
  category: string;
  brand: string;
  label: string;
  price: number;
};

export type ProductUpdateLog = {
  oldValue: Partial<ProductCreateLog>;
  newValue: Partial<ProductCreateLog>;
};

export type ProductArchiveLog = {
  isArchived: boolean;
};
