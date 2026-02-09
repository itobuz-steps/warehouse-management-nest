import type { Request } from 'express';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { ProductDocument } from 'src/products/entities/product.entity';
import { TransactionDocument } from '../schemas/transaction.schema';
import { WarehouseDocument } from 'src/warehouse/schemas/warehouse.schema';

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
