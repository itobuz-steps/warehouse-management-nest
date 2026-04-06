import type { Request } from 'express';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { ProductDocument } from 'src/products/entities/product.entity';
import { TransactionDocument } from '../schemas/transaction.schema';
import { WarehouseDocument } from 'src/warehouse/schemas/warehouse.schema';
import { Variant, VariantDocument } from 'src/variant/schemas/variant.schema';
import { Types } from 'mongoose';
import { CustomerDocument } from 'src/customer/entities/customer.entity';
import { SupplierDocument } from 'src/supplier/entities/supplier.entity';

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
  | 'products'
  | 'sourceWarehouse'
  | 'performedBy'
  | 'customer'
  | 'approvedBy'
  | 'destinationWarehouse'
> & {
  products: {
    product: ProductDocument & {
      supplier?: SupplierDocument | null;
    };
    variants: {
      variant: VariantDocument;
      quantity: number;
      batches?: {
        batch: string;
        quantity: number;
      }[];
    }[];
  }[];

  performedBy: UserDocument;

  sourceWarehouse?: WarehouseDocument | null;
  destinationWarehouse?: WarehouseDocument | null;

  customer?: CustomerDocument | null;

  supplier?: SupplierDocument | null;

  approvedBy?: UserDocument | null;
  approvedAt?: Date | null;
};

export type FlattenedItem = {
  sku: string;
  attributes: string;

  quantity: number;
  price: number;
  total: number;

  batches: {
    label: string;
    quantity: number;
  }[];
};

export type LogProduct = Array<{
  productId: string;
  variants: Array<{
    variantId: string;
    quantity: number;
  }>;
}>;

export type BatchBreakdownType = { batch: Types.ObjectId; quantity: number };
