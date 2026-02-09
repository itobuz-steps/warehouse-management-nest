import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationHelper } from './notification.helper';
import { NOTIFICATION_TYPES } from './notificationTypes';
import { User } from 'src/auth/entities/auth.entity';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';
import { Product } from 'src/products/entities/product.entity';
import { USER_TYPES } from 'src/auth/userType';

@Injectable()
export class NotificationTriggerService {
  constructor(
    private helper: NotificationHelper,

    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Warehouse.name) private warehouseModel: Model<Warehouse>,
  ) {}

  async notifyLowStock(
    productId: string,
    warehouseId: string,
    performedBy: string,
  ) {
    const product = await this.productModel.findById(productId);
    const warehouse = await this.warehouseModel.findById(warehouseId);

    const users = await this.userModel.find({
      $or: [{ role: 'admin' }, { _id: { $in: warehouse?.managerIds || [] } }],
    });

    await this.helper.notify({
      users,
      type: NOTIFICATION_TYPES.LOW_STOCK,
      title: 'Low Stock Alert',
      message: `${product.name} is running low in ${warehouse.name}`,
      product,
      warehouse,
      transactionPerformedBy: performedBy,
    });
  }

  async notifyPendingShipment(
    productId,
    warehouseId,
    transactionId,
    qty,
    performer,
  ) {
    const product = await this.productModel.findById(productId);
    const warehouse = await this.warehouseModel.findById(warehouseId);

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
      transactionId,
      transactionPerformedBy: performer,
    });
  }

  async notifyTransaction(
    productId: Types.ObjectId,
    warehouseId: Types.ObjectId,
    transactionId: string,
    quantity: number,
    transactionType: string,
    performedBy: string,
  ) {
    const product = await Product.findById(productId);
    const warehouse = await Warehouse.findById(warehouseId);
    const transaction = await Transaction.findById(transactionId);

    if (!product || !warehouse || !transaction) {
      throw new Error('Missing product / warehouse / transaction');
    }

    const users = await User.find({
      $or: [
        { role: USER_TYPES.ADMIN },
        { _id: { $in: warehouse.managerIds || [] } },
      ],
    });

    if (!users.length) return;

    await this.notificationHelper.notify({
      users,
      type: transactionType,
      title: `Transaction ${transaction.type} Alert`,
      message: `Transaction ${transaction.type} completed for ${product.name} (${quantity}) in ${warehouse.name}`,
      relatedProduct: product,
      warehouse,
      transaction,
      transactionPerformedBy: performedBy,
    });
  }
}
