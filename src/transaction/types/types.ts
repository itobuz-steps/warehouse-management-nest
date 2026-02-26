import type { Request } from 'express';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { ProductDocument } from 'src/products/entities/product.entity';
import { TransactionDocument } from '../schemas/transaction.schema';
import { WarehouseDocument } from 'src/warehouse/schemas/warehouse.schema';
import { Variant, VariantDocument } from 'src/variant/schemas/variant.schema';
import { Types } from 'mongoose';
import { CustomerDocument } from 'src/customer/entities/customer.entity';

export type RequestWithUserDocument = Request & {
  user: UserDocument;
};

export type PopulatedTransaction = TransactionDocument & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  product: ProductDocument;
  performedBy: UserDocument;
  sourceWarehouse: WarehouseDocument;
};

export type PopulatedVariant = Variant & { _id: Types.ObjectId };

export type PopulatedTransactionForPdfGeneration = Omit<
  TransactionDocument,
  'products' | 'sourceWarehouse' | 'performedBy | customer'
> & {
  products: {
    product: ProductDocument;
    variants: {
      variant: VariantDocument;
      quantity: number;
    }[];
  }[];
  performedBy: UserDocument;
  sourceWarehouse?: WarehouseDocument;
  customer: CustomerDocument;
};

export type FlattenedItem = {
  sku: string;
  attributes: string;
  quantity: number;
  price: number;
  total: number;
};
