import {
  BadRequestException,
  Injectable,
  // BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { StockInDto } from './dto/stock-in.dto';
import { Warehouse } from '../warehouse/schemas/warehouse.schema';
import { USER_TYPES } from 'src/auth/userType';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { WarehouseTransactionsQueryDto } from './dto/query/warehouse-transactions.query.dto';
import { GetTransactionsQueryDto } from './dto/query/get-transactions.query.dto';
import type { ClientSession, ObjectId, QueryFilter } from 'mongoose';
import { PdfService } from './services/pdf.service';
import { PopulatedTransaction } from './types/types';
import { Quantity } from 'src/quantity/entities/quantity.entity';
import { TRANSACTION_TYPES } from './constants/transactionConstants';
import { StockOutDto } from './dto/stock-out.dto';
import { Product } from 'src/products/entities/product.entity';
import { SHIPMENT_TYPES } from './constants/shipmentConstants';
import { TransferDto } from './dto/transfer.dto';
import { AdjustmentDto } from './dto/adjustment.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

    @InjectModel(Quantity.name)
    private readonly quantityModel: Model<Quantity>,

    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<Warehouse>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    @InjectConnection()
    private readonly connection: Connection,

    // private readonly notification: Notification,

    private readonly pdfService: PdfService,
  ) {}

  async getTransactions(query: GetTransactionsQueryDto, user: UserDocument) {
    const { startDate, endDate, type, status, page = 1, limit = 10 } = query;

    const match: QueryFilter<Transaction> = {};

    if (startDate || endDate) {
      match.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    if (type && type !== 'ALL') match.type = type;
    if (status && status !== 'ALL') match.shipment = status;

    if (user.role === USER_TYPES.MANAGER) {
      const warehouses = await this.warehouseModel
        .find({ managerIds: user._id })
        .select('_id');

      const ids = warehouses.map((w) => w._id);

      match.$or = [
        { sourceWarehouse: { $in: ids } },
        { destinationWarehouse: { $in: ids } },
      ];
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(match)
        .populate('product performedBy sourceWarehouse destinationWarehouse')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      this.transactionModel.countDocuments(match),
    ]);

    return {
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getWarehouseTransactions(
    warehouseId: string,
    query: WarehouseTransactionsQueryDto,
  ) {
    const { startDate, endDate, type, status, page = 1, limit = 10 } = query;

    const warehouseObjectId = new Types.ObjectId(warehouseId);

    const filter: QueryFilter<Transaction> = {
      $or: [
        { sourceWarehouse: warehouseObjectId },
        { destinationWarehouse: warehouseObjectId },
      ],
    };

    if (startDate || endDate) {
      filter.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    if (type && type !== 'ALL') filter.type = type;
    if (status && status !== 'ALL') filter.shipment = status;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .populate('product performedBy sourceWarehouse destinationWarehouse')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async createStockIn(dto: StockInDto, userId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const transactions: TransactionDocument[] = [];

      for (const item of dto.products) {
        const quantityRecord =
          (await this.quantityModel.findOne({
            warehouseId: dto.destinationWarehouse,
            productId: item.productId,
          })) ??
          new this.quantityModel({
            warehouseId: dto.destinationWarehouse,
            productId: item.productId,
            quantity: 0,
          });

        quantityRecord.quantity += item.quantity;
        await quantityRecord.save({ session });

        const tx = await this.transactionModel.create(
          [
            {
              type: TRANSACTION_TYPES.IN,
              product: item.productId,
              quantity: item.quantity,
              supplier: dto.supplier,
              destinationWarehouse: dto.destinationWarehouse,
              notes: dto.notes,
              performedBy: userId,
            },
          ],
          { session },
        );

        transactions.push(tx[0]);
      }

      await session.commitTransaction();

      const promises: Promise<void>[] = [];

      // for (const tx of transactions) {
      //   const notificationPromise = this.notification.notifyTransaction(
      //     tx.product,
      //     tx.destinationWarehouse,
      //     tx._id.toString(),
      //     tx.quantity,
      //     'STOCK_IN',
      //     userId,
      //   );
      // promises.push(notificationPromise);
      // }

      Promise.all(promises).catch(() =>
        console.error('Failed to send notification'),
      );

      return {
        success: true,
        message: 'Stock-in transactions created successfully',
        data: transactions,
      };
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      await session.endSession();
    }
  }

  async createStockOut(dto: StockOutDto, userId: string) {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    const transactions: Transaction[] = [];
    // const lowStockNotifications: {
    //   productId: string;
    //   warehouseId: string;
    // }[] = [];

    try {
      for (const item of dto.products) {
        const { productId, quantity } = item;

        const product = await this.productModel.findById(productId);
        if (!product) {
          throw new BadRequestException('Product not found');
        }

        const quantityRecord = await this.quantityModel.findOne({
          productId,
          warehouseId: dto.sourceWarehouse,
        });

        if (!quantityRecord) {
          throw new BadRequestException('Quantity record not found');
        }

        if (quantityRecord.quantity < quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${quantityRecord.quantity}`,
          );
        }

        // const previousQty = quantityRecord.quantity;

        quantityRecord.quantity -= quantity;
        await quantityRecord.save({ session });

        const transaction = await this.transactionModel.create(
          [
            {
              type: TRANSACTION_TYPES.OUT,
              product: productId,
              quantity,
              customerName: dto.customerName,
              customerEmail: dto.customerEmail,
              customerPhone: dto.customerPhone,
              customerAddress: dto.customerAddress,
              shipment: SHIPMENT_TYPES.PENDING,
              sourceWarehouse: dto.sourceWarehouse,
              notes: dto.notes,
              performedBy: new Types.ObjectId(userId),
            },
          ],
          { session },
        );

        transactions.push(transaction[0]);

        // if (
        //   quantityRecord.quantity <= quantityRecord.limit &&
        //   previousQty > quantityRecord.limit
        // ) {
        //   lowStockNotifications.push({
        //     productId,
        //     warehouseId: dto.sourceWarehouse,
        //   });
        // }
      }

      await session.commitTransaction();

      const promises: Promise<void>[] = [];

      // for (const trx of transactions) {
      //   const notificationPromise = this.notificationService.notifyPendingShipment(
      //     trx.product as Types.ObjectId,
      //     trx.sourceWarehouse as Types.ObjectId,
      //     trx._id.toString(),
      //     trx.quantity,
      //     userId,
      //   );
      // promises.push(notificationPromise);
      // }

      // for (const notif of lowStockNotifications) {
      //   const lowStockNotificationPromise = this.notificationService.notifyLowStock(
      //     notif.productId,
      //     notif.warehouseId,
      //     userId,
      //   );
      // promises.push(lowStockNotificationPromise);
      // }

      Promise.all(promises).catch(() =>
        console.error('Failed to send notification'),
      );

      return {
        success: true,
        message: 'Stock-out transactions created successfully',
        data: transactions,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async createTransfer(dto: TransferDto, userId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { products, sourceWarehouse, destinationWarehouse, notes } = dto;

      if (sourceWarehouse === destinationWarehouse) {
        throw new BadRequestException(
          'Source and destination warehouses cannot be the same',
        );
      }

      const transactions: Transaction[] = [];
      const updatedQuantities: {
        productId: ObjectId | string;
        sourceQuantity: Quantity;
        destQuantity: Quantity;
      }[] = [];

      for (const { productId, quantity } of products) {
        const product = await this.productModel.findById(productId);
        if (!product) throw new NotFoundException('Product not found');

        const sourceQty = await this.quantityModel.findOne({
          warehouseId: sourceWarehouse,
          productId,
        });

        if (!sourceQty)
          throw new NotFoundException('Product not found in source warehouse');

        // const prevQty = sourceQty.quantity;
        sourceQty.quantity -= quantity;
        await sourceQty.save({ session });

        let destQty = await this.quantityModel.findOne({
          warehouseId: destinationWarehouse,
          productId,
        });

        if (!destQty) {
          destQty = new this.quantityModel({
            warehouseId: destinationWarehouse,
            productId,
            quantity: 0,
          });
        }

        destQty.quantity += quantity;
        await destQty.save({ session });

        updatedQuantities.push({
          productId,
          sourceQuantity: sourceQty,
          destQuantity: destQty,
        });

        const tx = await this.transactionModel.create(
          [
            {
              type: TRANSACTION_TYPES.TRANSFER,
              product: productId,
              quantity,
              notes,
              sourceWarehouse,
              destinationWarehouse,
              performedBy: userId,
            },
          ],
          { session },
        );

        transactions.push(tx[0]);

        // if (
        //   sourceQty.quantity <= sourceQty.limit &&
        //   prevQty > sourceQty.limit
        // ) {
        //   await notification.notifyLowStock(productId, sourceWarehouse, userId);
        // }
      }

      await session.commitTransaction();

      const promises: Promise<void>[] = [];

      // for (const tx of transactions) {
      //   const notificationPromise = notification.notifyTransaction(
      //     tx.product,
      //     tx.sourceWarehouse,
      //     tx._id.toString(),
      //     tx.quantity,
      //     NOTIFICATION_TYPES.STOCK_TRANSFER,
      //     userId,
      //   );
      // promises.push(notificationPromise);
      // }

      Promise.all(promises).catch(() =>
        console.error('Failed to send notification'),
      );

      return {
        success: true,
        message: 'Stock transfer completed successfully',
        data: { transactions, updatedQuantities },
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async createAdjustment(dto: AdjustmentDto, userId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { products, warehouseId, reason, notes } = dto;
      const { productId, quantity } = products[0];

      const quantityRecord = await this.quantityModel.findOne({
        warehouseId,
        productId,
      });

      if (!quantityRecord)
        throw new NotFoundException('Quantity record not found');

      // const prevQty = quantityRecord.quantity;
      quantityRecord.quantity -= quantity;
      await quantityRecord.save({ session });

      const tx = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.ADJUSTMENT,
            product: productId,
            quantity,
            reason,
            notes,
            destinationWarehouse: warehouseId,
            performedBy: userId,
          },
        ],
        { session },
      );

      await session.commitTransaction();

      // if (
      //   quantityRecord.quantity <= quantityRecord.limit &&
      //   prevQty > quantityRecord.limit
      // ) {
      //   await notification.notifyLowStock(productId, warehouseId, userId);
      // }

      // await notification.notifyTransaction(
      //   tx[0].product,
      //   tx[0].destinationWarehouse,
      //   tx[0]._id.toString(),
      //   tx[0].quantity,
      //   NOTIFICATION_TYPES.STOCK_ADJUSTMENT,
      //   userId,
      // );

      return {
        success: true,
        message: 'Stock adjustment recorded successfully',
        data: {
          transaction: tx[0],
          updatedQuantity: quantityRecord,
        },
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async generateInvoice(id: string) {
    const transaction = await this.transactionModel
      .findById(id)
      .populate<PopulatedTransaction>('product performedBy sourceWarehouse');

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.product) {
      throw new BadRequestException('Product not found for transaction');
    }

    const pdf = await this.pdfService.generateTransactionPdf(transaction);

    const buffer = Buffer.from(pdf);

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename=invoice-${transaction._id}.pdf`,
    });
  }
}
