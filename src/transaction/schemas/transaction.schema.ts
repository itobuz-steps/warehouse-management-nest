import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { TRANSACTION_TYPES } from '../constants/transactionConstants';
import { SHIPMENT_TYPES } from '../constants/shipmentConstants';
import {
  TransactionProduct,
  TransactionProductSchema,
} from './transaction-product.schema';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ enum: Object.values(TRANSACTION_TYPES), required: true })
  type: string;

  @Prop({ type: [TransactionProductSchema], required: true })
  products: TransactionProduct[];

  @Prop()
  supplier?: string;

  @Prop()
  customerName?: string;

  @Prop()
  customerEmail?: string;

  @Prop()
  customerPhone?: number;

  @Prop()
  customerAddress?: string;

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

  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ 'items.product': 1 });
TransactionSchema.index({ 'items.variant': 1 });
TransactionSchema.index({ createdAt: -1 });
