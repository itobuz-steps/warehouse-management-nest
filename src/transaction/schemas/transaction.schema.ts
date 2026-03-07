import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TRANSACTION_TYPES } from '../constants/transactionConstants';
import { SHIPMENT_TYPES } from '../constants/shipmentConstants';
import {
  TransactionProduct,
  TransactionProductSchema,
} from './transaction-product.schema';
import { TRANSACTION_STATUS } from '../constants/transactionStatus';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ enum: Object.values(TRANSACTION_TYPES), required: true })
  type: TRANSACTION_TYPES;

  @Prop({ type: [TransactionProductSchema], required: true })
  products: TransactionProduct[];

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplier?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customer?: Types.ObjectId;

  @Prop({ enum: Object.values(SHIPMENT_TYPES) })
  shipment?: string;

  @Prop()
  reason?: string;

  @Prop({ default: '' })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  sourceWarehouse?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Warehouse' })
  destinationWarehouse?: Types.ObjectId;

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ default: false })
  requiresApproval: boolean;

  @Prop({
    enum: TRANSACTION_STATUS,
    default: TRANSACTION_STATUS.PENDING,
  })
  approvalStatus: TRANSACTION_STATUS;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ 'products.product': 1 });
TransactionSchema.index({ 'products.variants.variant': 1 });
TransactionSchema.index({ createdAt: -1 });
