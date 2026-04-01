import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { NotificationHelper } from './notification.helper';
import { NOTIFICATION_TYPES } from './notificationTypes';
import { User } from 'src/auth/entities/auth.entity';
import {
  Warehouse,
  WarehouseDocument,
} from 'src/warehouse/schemas/warehouse.schema';
import { Product } from 'src/products/entities/product.entity';
import { USER_TYPES } from 'src/auth/userType';
import {
  Transaction,
  TransactionDocument,
} from 'src/transaction/schemas/transaction.schema';
import {
  VariantStock,
  VariantStockDocument,
} from 'src/variant-stock/schemas/variant-stock.schema';
import { Variant, VariantDocument } from 'src/variant/schemas/variant.schema';

@Injectable()
export class NotificationTriggerService {
  constructor(
    private helper: NotificationHelper,

    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Warehouse.name)
    private warehouseModel: Model<WarehouseDocument>,

    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,

    @InjectModel(VariantStock.name)
    private variantStockModel: Model<VariantStockDocument>,

    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
  ) {}

  async notifyLowStock(
    productId: string,
    variantId: string,
    warehouseId: Types.ObjectId,
    performedBy: Types.ObjectId,
  ) {
    const LOW_STOCK_THRESHOLD = 50;

    const variantStock = await this.variantStockModel.findOne({
      variantId: new Types.ObjectId(variantId),
      warehouseId: new Types.ObjectId(warehouseId),
    });

    if (!variantStock || variantStock.quantity > LOW_STOCK_THRESHOLD) {
      return;
    }

    const product = await this.productModel.findById(productId);
    const warehouse = await this.warehouseModel.findById(warehouseId);
    const variant = await this.variantModel.findById(variantId);

    if (!product || !warehouse || !variant) {
      return;
    }

    const users = await this.userModel.find({
      $or: [{ role: 'admin' }, { _id: { $in: warehouse.managerIds || [] } }],
    });

    await this.helper.notify({
      users,
      type: NOTIFICATION_TYPES.LOW_STOCK,
      title: 'Low Stock Alert',
      message: `${product.name} (${variant.sku}) is running low in ${warehouse.name}, only ${variantStock.quantity} unit(s) remaining.`,
      relatedProduct: productId,
      relatedVariant: variantId,
      product,
      warehouse,
      warehouseId,
      transactionPerformedBy: performedBy,
    });
  }

  async notifyPendingShipment(
    productId: Types.ObjectId,
    warehouseId: Types.ObjectId,
    transactionId: Types.ObjectId,
    qty: number,
    performer: Types.ObjectId,
  ) {
    const product: Product = (await this.productModel.findById(
      productId,
    )) as Product;
    const warehouse: WarehouseDocument = (await this.warehouseModel.findById(
      warehouseId,
    )) as WarehouseDocument;

    const users = await this.userModel.find({
      $or: [{ role: 'admin' }, { _id: { $in: warehouse?.managerIds || [] } }],
    });

    await this.helper.notify({
      users,
      type: NOTIFICATION_TYPES.PENDING_SHIPMENT,
      title: 'Pending Shipment Alert',
      message: `Shipment pending for ${product.name} (${qty}) from ${warehouse.name}`,
      product,
      warehouse,
      transactionId: new mongoose.Types.ObjectId(transactionId),
      transactionPerformedBy: new mongoose.Types.ObjectId(performer),
    });
  }

  async notifyTransaction(
    productId: Types.ObjectId,
    warehouseId: Types.ObjectId,
    transactionId: string,
    quantity: number,
    transactionType: NOTIFICATION_TYPES | string,
    performedBy: string,
  ) {
    const product = await this.productModel.findById(productId);
    const warehouse = await this.warehouseModel.findById(warehouseId);
    const transaction = await this.transactionModel.findById(transactionId);

    if (!product || !warehouse || !transaction) {
      throw new Error('Missing product / warehouse / transaction');
    }

    const users = await this.userModel.find({
      $or: [
        { role: USER_TYPES.ADMIN },
        { _id: { $in: warehouse.managerIds || [] } },
      ],
    });

    if (!users.length) return;

    await this.helper.notify({
      users,
      type: transactionType,
      title: `Transaction ${transaction.type} Alert`,
      message: `Transaction ${transaction.type} completed for ${product.name} (${quantity}) in ${warehouse.name}`,

      product,
      warehouse,

      relatedProduct: product._id,
      warehouseId: warehouse._id,
      transactionId: transaction._id,
      transactionPerformedBy: new Types.ObjectId(performedBy),
    });
  }
}
