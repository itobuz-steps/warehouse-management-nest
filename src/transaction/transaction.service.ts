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
import {
  LogProduct,
  PopulatedTransactionForPdfGeneration,
} from './types/types';
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
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LogAction } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Customer } from 'src/customer/entities/customer.entity';
import { Variant } from 'src/variant/schemas/variant.schema';

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

    @InjectModel(Variant.name)
    private readonly variantModel: Model<Variant>,

    @InjectModel(Customer.name)
    private readonly customerModel: Model<Customer>,

    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<Supplier>,

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

    private readonly logsService: TransactionLogsService,
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
        .populate('products performedBy sourceWarehouse destinationWarehouse')
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
        .populate('products performedBy sourceWarehouse destinationWarehouse')
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

  async createStockIn(dto: StockInDto, user: UserDocument) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const warehouseId = new Types.ObjectId(dto.destinationWarehouse);
      const performedBy = new Types.ObjectId(user._id);

      const [createdTransaction] = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.IN,
            supplier: new Types.ObjectId(dto.supplier),
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
            { $inc: { quantity: variant.quantity } },
            { upsert: true, session },
          );
        }
      }

      await session.commitTransaction();

      const supplier = await this.supplierModel
        .findById(dto.supplier)
        .select('name email')
        .lean();

      const warehouse = await this.warehouseModel
        .findById(warehouseId)
        .select('name')
        .lean();

      if (!supplier || !warehouse) {
        throw new BadRequestException('Supplier or Warehouse not found');
      }

      const products = await this.buildProductLogItems(dto.products);

      await this.logsService.createLog({
        action: LogAction.STOCK_IN,
        entityType: LOG_ENTITY_TYPE.TRANSACTION,
        entityId: createdTransaction._id.toString(),
        performedBy: user,
        metadata: {
          supplier: {
            supplierId: supplier._id.toString(),
            name: supplier.name,
            email: supplier.email,
          },

          destinationWarehouse: {
            warehouseId: warehouse._id.toString(),
            name: warehouse.name,
          },

          products,
        },
      });

      const notificationPromises: Promise<void>[] = [];

      for (const product of dto.products) {
        for (const variant of product.variants) {
          notificationPromises.push(
            this.notificationTriggerService.notifyTransaction(
              new Types.ObjectId(product.productId),
              warehouseId,
              createdTransaction._id.toString(),
              variant.quantity,
              NOTIFICATION_TYPES.STOCK_IN,
              user._id.toHexString(),
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
        data: createdTransaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createStockOut(dto: StockOutDto, user: UserDocument) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const warehouseId = new Types.ObjectId(dto.sourceWarehouse);
      const performedBy = new Types.ObjectId(user._id);
      const customerId = new Types.ObjectId(dto.customer);

      const [transaction] = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.OUT,
            customer: customerId,
            shipment: SHIPMENT_TYPES.PENDING,
            sourceWarehouse: warehouseId,
            notes: dto.notes,
            performedBy,
            products: dto.products.map((p) => ({
              product: new Types.ObjectId(p.productId),
              variants: p.variants.map((v) => ({
                variant: new Types.ObjectId(v.variantId),
                quantity: v.quantity,
              })),
            })),
          },
        ],
        { session },
      );

      for (const product of dto.products) {
        for (const variant of product.variants) {
          const variantId = new Types.ObjectId(variant.variantId);
          const requiredQty = variant.quantity;

          const stockUpdate = await this.variantStockModel.updateOne(
            {
              variantId,
              warehouseId,
              quantity: { $gte: requiredQty },
            },
            {
              $inc: { quantity: -requiredQty },
            },
            { session },
          );

          if (!stockUpdate.modifiedCount) {
            throw new BadRequestException(
              `Insufficient stock for variant ${variant.variantId}`,
            );
          }

          let remainingToDeduct = requiredQty;

          const batches = await this.batchModel
            .find(
              {
                destinationWarehouse: warehouseId,
                'items.variant': variantId,
                'items.remainingQuantity': { $gt: 0 },
              },
              { items: 1 },
            )
            .sort({ createdAt: 1 })
            .lean()
            .session(session);

          for (const batch of batches) {
            if (!remainingToDeduct) break;

            const item = batch.items.find(
              (i) =>
                i.variant.toString() === variantId.toString() &&
                i.remainingQuantity > 0,
            );

            if (!item) continue;

            const deduct = Math.min(item.remainingQuantity, remainingToDeduct);

            const batchUpdate = await this.batchModel.updateOne(
              {
                _id: batch._id,
                'items.variant': variantId,
                'items.remainingQuantity': { $gte: deduct },
              },
              {
                $inc: { 'items.$.remainingQuantity': -deduct },
              },
              { session },
            );

            if (!batchUpdate.modifiedCount) {
              continue;
            }

            remainingToDeduct -= deduct;
          }

          if (remainingToDeduct) {
            throw new BadRequestException(
              'Stock inconsistency detected (FIFO failure)',
            );
          }
        }
      }

      await session.commitTransaction();

      const customer = await this.customerModel
        .findById(dto.customer)
        .select('name email')
        .lean();

      const warehouse = await this.warehouseModel
        .findById(warehouseId)
        .select('name')
        .lean();

      if (!customer || !warehouse) {
        throw new BadRequestException('Supplier or Warehouse not found');
      }

      const products = await this.buildProductLogItems(dto.products);

      await this.logsService.createLog({
        action: LogAction.STOCK_OUT,
        entityType: LOG_ENTITY_TYPE.TRANSACTION,
        entityId: transaction._id.toString(),
        performedBy: user,
        metadata: {
          customer: {
            customerId: customer._id.toString(),
            name: customer.name as string,
            email: customer.email,
          },

          sourceWarehouse: {
            warehouseId: warehouse._id.toString(),
            name: warehouse.name,
          },

          products,
          shipmentStatus: SHIPMENT_TYPES.PENDING,
        },
      });

      Promise.all(
        dto.products.flatMap((product) =>
          product.variants.map((variant) =>
            this.notificationTriggerService.notifyPendingShipment(
              new Types.ObjectId(product.productId),
              warehouseId,
              transaction._id,
              variant.quantity,
              performedBy,
            ),
          ),
        ),
      ).catch(() => console.error('Notification failure'));

      return {
        success: true,
        message: 'Stock-out transaction created successfully',
        data: transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createTransfer(dto: TransferDto, user: UserDocument) {
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
      const performedBy = new Types.ObjectId(user._id);

      const [transaction] = await this.transactionModel.create(
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

      const sourceWarehouseDoc = await this.warehouseModel
        .findById(sourceWarehouseId)
        .lean();

      const destinationWarehouseDoc = await this.warehouseModel
        .findById(destinationWarehouseId)
        .select('name')
        .lean();

      if (!sourceWarehouseDoc || !destinationWarehouseDoc) {
        throw new BadRequestException("Warehouses doesn't exists");
      }

      const newProducts = await this.buildProductLogItems(products);

      await this.logsService.createLog({
        action: LogAction.STOCK_TRANSFER,
        entityType: LOG_ENTITY_TYPE.TRANSACTION,
        entityId: transaction._id.toString(),
        performedBy: user,
        metadata: {
          sourceWarehouse: {
            warehouseId: sourceWarehouseDoc._id.toHexString(),
            name: sourceWarehouseDoc.name,
          },
          destinationWarehouse: {
            warehouseId: destinationWarehouseDoc._id.toHexString(),
            name: destinationWarehouseDoc.name,
          },
          products: newProducts,
        },
      });

      const promises: Promise<void>[] = [];

      for (const product of products) {
        for (const variant of product.variants) {
          promises.push(
            this.notificationTriggerService.notifyTransaction(
              new Types.ObjectId(product.productId),
              sourceWarehouseId,
              transaction._id.toString(),
              variant.quantity,
              NOTIFICATION_TYPES.STOCK_TRANSFER,
              user._id.toHexString(),
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
        data: transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async createAdjustment(dto: AdjustmentDto, user: UserDocument) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { products, sourceWarehouse, reason, notes } = dto;

      const warehouseId = new Types.ObjectId(sourceWarehouse);
      const performedBy = new Types.ObjectId(user._id);

      const [transaction] = await this.transactionModel.create(
        [
          {
            type: TRANSACTION_TYPES.ADJUSTMENT,
            destinationWarehouse: warehouseId,
            reason,
            notes,
            performedBy,
            products: products.map((product) => ({
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

      for (const product of products) {
        for (const variant of product.variants) {
          const variantId = new Types.ObjectId(variant.variantId);
          const adjustmentQty = variant.quantity;

          const stock = await this.variantStockModel.findOne({
            variantId,
            warehouseId: warehouseId,
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
                  destinationWarehouse: warehouseId,
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

      const destinationWarehouseDoc = await this.warehouseModel
        .findById(warehouseId)
        .select('name')
        .lean();

      if (!destinationWarehouseDoc) {
        throw new BadRequestException("Warehouses doesn't exists");
      }

      const newProducts = await this.buildProductLogItems(products);

      await this.logsService.createLog({
        action: LogAction.STOCK_ADJUSTED,
        entityType: LOG_ENTITY_TYPE.TRANSACTION,
        entityId: transaction._id.toString(),
        performedBy: user,
        metadata: {
          destinationWarehouse: {
            warehouseId: destinationWarehouseDoc._id.toHexString(),
            name: destinationWarehouseDoc.name,
          },
          reason,
          products: newProducts,
        },
      });

      const promises: Promise<void>[] = [];

      for (const product of products) {
        for (const variant of product.variants) {
          promises.push(
            this.notificationTriggerService.notifyTransaction(
              new Types.ObjectId(product.productId),
              warehouseId,
              transaction._id.toString(),
              variant.quantity,
              NOTIFICATION_TYPES.STOCK_ADJUSTMENT,
              user._id.toHexString(),
            ),
          );
        }
      }

      Promise.all(promises).catch(() => console.error('Notification failed'));

      return {
        success: true,
        message: 'Stock adjustment recorded successfully',
        data: transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async buildProductLogItems(products: LogProduct) {
    const variantIds = products.flatMap((p) =>
      p.variants.map((v) => new Types.ObjectId(v.variantId)),
    );

    const variants = await this.variantModel
      .find({ _id: { $in: variantIds } })
      .populate({
        path: 'product',
        select: 'name',
      })
      .select('_id sku product')
      .lean<
        Array<{
          _id: Types.ObjectId;
          sku: string;
          product: { name: string };
        }>
      >();

    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));

    return products.flatMap((product) =>
      product.variants.map((variant) => {
        const variantDoc = variantMap.get(variant.variantId);

        return {
          productId: product.productId,
          productName: variantDoc?.product?.name ?? '',
          variantId: variant.variantId,
          sku: variantDoc?.sku ?? '',
          quantity: variant.quantity,
        };
      }),
    );
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
