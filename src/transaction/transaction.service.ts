import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { Transaction } from './schemas/transaction.schema';
import { StockInDto } from './dto/stock-in.dto';
import { Notification } from 'src/notification/entities/notification.entity';
import { Warehouse } from '../warehouse/schemas/warehouse.schema';
import { USER_TYPES } from 'src/auth/userType';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { WarehouseTransactionsQueryDto } from './dto/query/warehouse-transactions.query.dto';
import { GetTransactionsQueryDto } from './dto/query/get-transactions.query.dto';
import type { QueryFilter } from 'mongoose';
import { PdfService } from './services/pdf.service';
import { PopulatedTransactionForPdfGeneration } from './types/types';
import { Quantity } from 'src/quantity/entities/quantity.entity';
import { TRANSACTION_TYPES } from './constants/transactionConstants';
import { StockOutDto } from './dto/stock-out.dto';
import { Product } from 'src/products/entities/product.entity';
import { SHIPMENT_TYPES } from './constants/shipmentConstants';
import { TransferDto } from './dto/transfer.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationTriggerService } from 'src/notification/notification-trigger.service';
import { NOTIFICATION_TYPES } from 'src/notification/notificationTypes';
import { Batch } from 'src/batch/schemas/batch.schema';
import { VariantStock } from 'src/variant-stock/schemas/variant-stock.schema';

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

    @InjectModel(Notification.name)
    private readonly notification: Model<Notification>,

    @InjectModel(Batch.name)
    private readonly batchModel: Model<Batch>,

    @InjectModel(VariantStock.name)
    private readonly variantStockModel: Model<VariantStock>,

    private readonly pdfService: PdfService,

    private readonly notificationService: NotificationService,

    private readonly notificationTriggerService: NotificationTriggerService,
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
      message: 'Transactions retrieved successfully',
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
      message: 'Warehouse transactions retrieved successfully',
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
      const warehouseId = new Types.ObjectId(dto.destinationWarehouse);
      const performedBy = new Types.ObjectId(userId);

      const transaction = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.IN,
            supplier: dto.supplier,
            destinationWarehouse: warehouseId,
            notes: dto.notes,
            performedBy,
            products: dto.products.map((product) => ({
              product: new Types.ObjectId(product.productId),
              variants: product.variants.map((variant) => ({
                variant: new Types.ObjectId(variant.variantId),
                quantity: variant.quantity,
              })),
            })),
          },
        ],
        { session },
      );

      for (const product of dto.products) {
        await this.batchModel.create(
          [
            {
              destinationWarehouse: warehouseId,
              items: product.variants.map((variant) => ({
                variant: new Types.ObjectId(variant.variantId),
                quantity: variant.quantity,
                remainingQuantity: variant.quantity,
              })),
            },
          ],
          { session },
        );

        for (const variant of product.variants) {
          await this.variantStockModel.findOneAndUpdate(
            {
              variantId: new Types.ObjectId(variant.variantId),
              warehouseId,
            },
            {
              $inc: { quantity: variant.quantity },
            },
            {
              upsert: true,
              session,
            },
          );
        }
      }

      await session.commitTransaction();

      const notificationPromises: Promise<void>[] = [];

      for (const product of dto.products) {
        for (const variant of product.variants) {
          notificationPromises.push(
            this.notificationTriggerService.notifyTransaction(
              new Types.ObjectId(product.productId),
              warehouseId,
              transaction[0]._id.toString(),
              variant.quantity,
              NOTIFICATION_TYPES.STOCK_IN,
              userId,
            ),
          );
        }
      }

      Promise.all(notificationPromises).catch(() =>
        console.error('Notification failed'),
      );

      return {
        success: true,
        message: 'Stock-in transaction created successfully',
        data: transaction[0],
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createStockOut(dto: StockOutDto, userId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const warehouseId = new Types.ObjectId(dto.sourceWarehouse);
      const performedBy = new Types.ObjectId(userId);

      const transaction = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.OUT,
            customerName: dto.customerName,
            customerEmail: dto.customerEmail,
            customerPhone: dto.customerPhone,
            customerAddress: dto.customerAddress,
            shipment: SHIPMENT_TYPES.PENDING,
            sourceWarehouse: warehouseId,
            notes: dto.notes,
            performedBy,
            products: dto.products.map((product) => ({
              product: product.productId,
              variants: product.variants.map((variant) => ({
                variant: variant.variantId,
                quantity: variant.quantity,
              })),
            })),
          },
        ],
        { session },
      );

      for (const product of dto.products) {
        for (const variant of product.variants) {
          const variantId = new Types.ObjectId(variant.variantId);

          const stock = await this.variantStockModel.findOne({
            variantId,
            warehouseId,
          });

          if (!stock) {
            throw new BadRequestException('Variant stock not found');
          }

          if (stock.quantity < variant.quantity) {
            throw new BadRequestException(
              `Insufficient stock for variant ${variant.variantId}`,
            );
          }

          let remainingToDeduct = variant.quantity;

          const batches = await this.batchModel
            .find({
              destinationWarehouse: warehouseId,
              'items.variant': variantId,
              'items.remainingQuantity': { $gt: 0 },
            })
            .sort({ createdAt: 1 })
            .session(session);

          for (const batch of batches) {
            const item = batch.items.find(
              (i) =>
                i.variant.toString() === variantId.toString() &&
                i.remainingQuantity,
            );

            if (!item) continue;

            const deduct = Math.min(item.remainingQuantity, remainingToDeduct);

            item.remainingQuantity -= deduct;
            remainingToDeduct -= deduct;

            await batch.save({ session });

            if (!remainingToDeduct) break;
          }

          if (remainingToDeduct) {
            throw new BadRequestException(
              'Stock inconsistency detected (FIFO failure)',
            );
          }

          stock.quantity -= variant.quantity;
          await stock.save({ session });
        }
      }

      await session.commitTransaction();

      const promises: Promise<void>[] = [];

      for (const product of dto.products) {
        for (const variant of product.variants) {
          promises.push(
            this.notificationTriggerService.notifyPendingShipment(
              new Types.ObjectId(product.productId),
              warehouseId,
              transaction[0]._id,
              variant.quantity,
              performedBy,
            ),
          );
        }
      }

      Promise.all(promises).catch(() =>
        console.error('Failed to send notification'),
      );

      return {
        success: true,
        message: 'Stock-out transaction created successfully',
        data: transaction[0],
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
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

      const sourceWarehouseId = new Types.ObjectId(sourceWarehouse);
      const destinationWarehouseId = new Types.ObjectId(destinationWarehouse);
      const performedBy = new Types.ObjectId(userId);

      const transaction = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.TRANSFER,
            sourceWarehouse: sourceWarehouseId,
            destinationWarehouse: destinationWarehouseId,
            notes,
            performedBy,
            products: products.map((product) => ({
              product: product.productId,
              variants: product.variants.map((variant) => ({
                variant: variant.variantId,
                quantity: variant.quantity,
              })),
            })),
          },
        ],
        { session },
      );

      for (const product of products) {
        for (const variant of product.variants) {
          const variantId = new Types.ObjectId(variant.variantId);

          const sourceStock = await this.variantStockModel.findOne({
            variantId,
            warehouseId: sourceWarehouseId,
          });

          if (!sourceStock || sourceStock.quantity < variant.quantity) {
            throw new BadRequestException(
              `Insufficient stock for variant ${variant.variantId}`,
            );
          }

          let remainingToMove = variant.quantity;

          const batches = await this.batchModel
            .find({
              destinationWarehouse: sourceWarehouseId,
              'items.variant': variantId,
              'items.remainingQuantity': { $gt: 0 },
            })
            .sort({ createdAt: 1 })
            .session(session);

          for (const batch of batches) {
            const item = batch.items.find(
              (i) =>
                i.variant.toString() === variantId.toString() &&
                i.remainingQuantity,
            );

            if (!item) continue;

            const deduct = Math.min(item.remainingQuantity, remainingToMove);

            item.remainingQuantity -= deduct;
            remainingToMove -= deduct;

            await batch.save({ session });

            if (!remainingToMove) break;
          }

          if (remainingToMove) {
            throw new BadRequestException('FIFO inconsistency detected');
          }

          sourceStock.quantity -= variant.quantity;
          await sourceStock.save({ session });

          await this.variantStockModel.findOneAndUpdate(
            {
              variantId,
              warehouseId: destinationWarehouseId,
            },
            {
              $inc: { quantity: variant.quantity },
            },
            {
              upsert: true,
              session,
            },
          );

          await this.batchModel.create(
            [
              {
                sourceWarehouse: sourceWarehouseId,
                destinationWarehouse: destinationWarehouseId,
                items: [
                  {
                    variant: variantId,
                    quantity: variant.quantity,
                    remainingQuantity: variant.quantity,
                  },
                ],
              },
            ],
            { session },
          );
        }
      }

      await session.commitTransaction();

      const promises: Promise<void>[] = [];

      for (const product of products) {
        for (const variant of product.variants) {
          promises.push(
            this.notificationTriggerService.notifyTransaction(
              new Types.ObjectId(product.productId),
              sourceWarehouseId,
              transaction[0]._id.toString(),
              variant.quantity,
              NOTIFICATION_TYPES.STOCK_TRANSFER,
              userId,
            ),
          );
        }
      }

      Promise.all(promises).catch(() =>
        console.error('Failed to send notification'),
      );

      return {
        success: true,
        message: 'Stock transfer completed successfully',
        data: transaction[0],
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createAdjustment(dto: AdjustmentDto, userId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { products, warehouseId, reason, notes } = dto;

      const warehouseObjectId = new Types.ObjectId(warehouseId);
      const performedBy = new Types.ObjectId(userId);

      const transaction = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.ADJUSTMENT,
            destinationWarehouse: warehouseObjectId,
            reason,
            notes,
            performedBy,
            products: products.map((product) => ({
              product: product.productId,
              variants: product.variants.map((variant) => ({
                variant: variant.variantId,
                quantity: variant.quantity,
              })),
            })),
          },
        ],
        { session },
      );

      for (const product of products) {
        for (const variant of product.variants) {
          const variantId = new Types.ObjectId(variant.variantId);
          const adjustmentQty = variant.quantity;

          const stock = await this.variantStockModel.findOne({
            variantId,
            warehouseId: warehouseObjectId,
          });

          if (!stock) {
            throw new NotFoundException('Variant stock not found');
          }

          if (adjustmentQty === 0) {
            throw new BadRequestException('Adjustment quantity cannot be zero');
          }

          if (adjustmentQty < 0) {
            const absoluteQty = Math.abs(adjustmentQty);

            if (stock.quantity < absoluteQty) {
              throw new BadRequestException(
                `Insufficient stock for variant ${variant.variantId}`,
              );
            }

            let remainingToDeduct = absoluteQty;

            const batches = await this.batchModel
              .find({
                destinationWarehouse: warehouseObjectId,
                'items.variant': variantId,
                'items.remainingQuantity': { $gt: 0 },
              })
              .sort({ createdAt: 1 })
              .session(session);

            for (const batch of batches) {
              const item = batch.items.find(
                (i) =>
                  i.variant.toString() === variantId.toString() &&
                  i.remainingQuantity > 0,
              );

              if (!item) continue;

              const deduct = Math.min(
                item.remainingQuantity,
                remainingToDeduct,
              );

              item.remainingQuantity -= deduct;
              remainingToDeduct -= deduct;

              await batch.save({ session });

              if (remainingToDeduct === 0) break;
            }

            if (remainingToDeduct > 0) {
              throw new BadRequestException('FIFO inconsistency detected');
            }

            stock.quantity -= absoluteQty;
            await stock.save({ session });
          }

          if (adjustmentQty > 0) {
            stock.quantity -= adjustmentQty;
            await stock.save({ session });

            await this.batchModel.create(
              [
                {
                  destinationWarehouse: warehouseObjectId,
                  items: [
                    {
                      variant: variantId,
                      quantity: adjustmentQty,
                      remainingQuantity: adjustmentQty,
                    },
                  ],
                },
              ],
              { session },
            );
          }
        }
      }

      await session.commitTransaction();

      const promises: Promise<void>[] = [];

      for (const product of products) {
        for (const variant of product.variants) {
          promises.push(
            this.notificationTriggerService.notifyTransaction(
              new Types.ObjectId(product.productId),
              warehouseObjectId,
              transaction[0]._id.toString(),
              variant.quantity,
              NOTIFICATION_TYPES.STOCK_ADJUSTMENT,
              userId,
            ),
          );
        }
      }

      Promise.all(promises).catch(() => console.error('Notification failed'));

      return {
        success: true,
        message: 'Stock adjustment recorded successfully',
        data: transaction[0],
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async generateInvoice(id: string) {
    const transaction = await this.transactionModel
      .findById(id)
      .populate({
        path: 'products.variants.variant',
      })
      .populate('products.product')
      .populate('sourceWarehouse')
      .populate('performedBy')
      .lean<PopulatedTransactionForPdfGeneration>();
    console.log(transaction);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.products?.length) {
      throw new BadRequestException('Product not found for transaction');
    }

    const pdfBuffer = await this.pdfService.generateTransactionPdf(transaction);

    return new StreamableFile(pdfBuffer, {
      type: 'application/pdf',
      disposition: `attachment; filename=invoice-${transaction._id.toString()}.pdf`,
    });
  }
}
