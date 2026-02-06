import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationHelper } from './notification.helper';
import { NOTIFICATION_TYPES } from './notification.types';
import User from '../user/entities/user.entity';
import Warehouse from '../warehouse/entities/warehouse.entity';
import Product from '../product/entities/product.entity';

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
}
