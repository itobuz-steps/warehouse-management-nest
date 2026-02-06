export type TotalQuantityResult = {
  _id: string;
  totalQuantity: number;
};
export type CountResult = {
  count: number;
};

export type WarehouseProductResult = {
  _id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  limit: number;
  product: {
    _id: string;
    name: string;
    category: string;
    isArchived: boolean;
  };
};
