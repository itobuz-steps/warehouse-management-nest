export type ProductCreateLog = {
  name: string;
  category: string;
  brand: string;
  label: string;
  description: string;
  isArchived: boolean;
};

export type ProductUpdateLog = {
  oldValue: { description?: string };
  newValue: { description?: string };
};

export type ProductArchiveLog = {
  name: string;
  isArchived: boolean;
};
