import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types, isValidObjectId } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { StockInDto } from './dto/stock-in.dto';
import {
  Warehouse,
  WarehouseDocument,
} from '../warehouse/schemas/warehouse.schema';
import { USER_TYPES } from 'src/auth/userType';
import { User, UserDocument } from 'src/auth/entities/auth.entity';
import { WarehouseTransactionsQueryDto } from './dto/query/warehouse-transactions.query.dto';
import { GetTransactionsQueryDto } from './dto/query/get-transactions.query.dto';
import type { ClientSession, QueryFilter } from 'mongoose';
import { PdfService } from './services/pdf.service';
import {
  BatchBreakdownType,
  LogProduct,
  PopulatedTransactionForPdfGeneration,
} from './types/types';
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
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Customer } from 'src/customer/entities/customer.entity';
import { Variant } from 'src/variant/schemas/variant.schema';
import { TRANSACTION_STATUS } from './constants/transactionStatus';
import { ProductItemDto } from './dto/product-item.dto';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

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

    @InjectModel(Batch.name)
    private readonly batchModel: Model<Batch>,

    @InjectModel(VariantStock.name)
    private readonly variantStockModel: Model<VariantStock>,

    private readonly pdfService: PdfService,

    private readonly notificationService: NotificationService,

    private readonly notificationTriggerService: NotificationTriggerService,

    private readonly logsService: TransactionLogsService,

    private readonly s3Service: StorageService,
  ) {}

  async getTransactions(query: GetTransactionsQueryDto, user: UserDocument) {
    const {
      startDate,
      endDate,
      type,
      status,
      approvalStatus,
      page = 1,
      limit = 10,
    } = query;

    const scopeMatch: QueryFilter<Transaction> = {};

    if (startDate || endDate) {
      scopeMatch.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    if (user.role === USER_TYPES.MANAGER) {
      const warehouses = await this.warehouseModel
        .find({ managerIds: user._id })
        .select('_id');

      const ids = warehouses.map((w) => w._id);

      scopeMatch.$or = [
        { sourceWarehouse: { $in: ids } },
        { destinationWarehouse: { $in: ids } },
      ];
    }

    const match: QueryFilter<Transaction> = { ...scopeMatch };

    if (type && type !== 'ALL') match.type = type;
    if (status && status !== 'ALL') match.shipment = status;
    if (approvalStatus && approvalStatus !== 'ALL') {
      match.approvalStatus = approvalStatus;
    }

    const skip = (page - 1) * limit;

    const [transactions, total, [filteredCounts], [approvalCounts]] =
      await Promise.all([
        this.transactionModel
          .find(match)
          .populate([
            { path: 'performedBy', select: 'name email role profileImageKey' },
            { path: 'supplier', select: 'name email address phoneNumber' },
            { path: 'customer', select: 'name email address phoneNumber' },
            { path: 'sourceWarehouse', select: 'name address description' },
            {
              path: 'destinationWarehouse',
              select: 'name address description',
            },
            { path: 'products.product', select: 'name category' },
            {
              path: 'products.variants.variant',
              select: 'sku attributes varinatImage',
            },
            { path: 'approvedBy', select: 'name profileImageKey' },
            {
              path: 'products.variants.batches.batch',
              select: 'items sourceWarehouse destinationWarehouse createdAt',
              populate: [
                { path: 'sourceWarehouse', select: 'name address description' },
                {
                  path: 'destinationWarehouse',
                  select: 'name address description',
                },
              ],
            },
          ])
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),

        this.transactionModel.countDocuments(match),

        this.transactionModel.aggregate<{
          types: { _id: string; count: number }[];
          status: { _id: string; count: number }[];
        }>([
          { $match: match },
          {
            $facet: {
              types: [
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
              status: [
                { $match: { shipment: { $exists: true, $ne: null } } },
                { $group: { _id: '$shipment', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ]),

        this.transactionModel.aggregate<{
          approval: { _id: string; count: number }[];
        }>([
          { $match: scopeMatch },
          {
            $facet: {
              approval: [
                { $group: { _id: '$approvalStatus', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ]),
      ]);

    for (const transaction of transactions) {
      const performedBy = transaction.performedBy as unknown as User;
      if (performedBy?.profileImageKey) {
        performedBy.profileImage = await this.s3Service.getPresignedSignedUrl(
          performedBy.profileImageKey,
        );
      }
    }

    for (const transaction of transactions) {
      const approvedBy = transaction.approvedBy as unknown as User;
      if (approvedBy?.profileImageKey) {
        approvedBy.profileImage = await this.s3Service.getPresignedSignedUrl(
          approvedBy.profileImageKey,
        );
      }
    }

    return {
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        transactions,
        counts: {
          types: filteredCounts?.types ?? [],
          status: filteredCounts?.status ?? [],
          approval: approvalCounts?.approval ?? [],
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getTransactionById(id: string) {
    const transaction = await this.transactionModel.findById(id).populate([
      { path: 'performedBy', select: 'name email role profileImageKey' },
      { path: 'supplier', select: 'name email address phoneNumber' },
      { path: 'customer', select: 'name email address phoneNumber' },
      { path: 'sourceWarehouse', select: 'name address description' },
      { path: 'destinationWarehouse', select: 'name address description' },
      { path: 'products.product', select: 'name category' },
      {
        path: 'products.variants.variant',
        select: 'sku attributes variantImage',
      },
      { path: 'approvedBy', select: 'name profileImageKey' },
      {
        path: 'products.variants.batches.batch',
        select: 'items sourceWarehouse destinationWarehouse createdAt',
        populate: [
          { path: 'sourceWarehouse', select: 'name address description' },
          { path: 'destinationWarehouse', select: 'name address description' },
        ],
      },
    ]);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const performedBy = transaction.performedBy as unknown as User;
    if (performedBy?.profileImageKey) {
      performedBy.profileImage = await this.s3Service.getPresignedSignedUrl(
        performedBy.profileImageKey,
      );
    }

    const approvedBy = transaction.approvedBy as unknown as User;
    if (approvedBy?.profileImageKey) {
      approvedBy.profileImage = await this.s3Service.getPresignedSignedUrl(
        approvedBy.profileImageKey,
      );
    }

    return {
      success: true,
      data: transaction,
    };
  }

  async getWarehouseTransactions(
    warehouseId: string,
    query: WarehouseTransactionsQueryDto,
  ) {
    const {
      startDate,
      endDate,
      type,
      status,
      approvalStatus,
      page = 1,
      limit = 10,
    } = query;

    if (!isValidObjectId(warehouseId)) {
      return;
    }

    const warehouseObjectId = new Types.ObjectId(warehouseId);

    const scopeMatch: QueryFilter<Transaction> = {
      $or: [
        { sourceWarehouse: warehouseObjectId },
        { destinationWarehouse: warehouseObjectId },
      ],
    };

    if (startDate || endDate) {
      scopeMatch.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    const filter: QueryFilter<Transaction> = { ...scopeMatch };

    if (type && type !== 'ALL') filter.type = type;
    if (status && status !== 'ALL') filter.shipment = status;
    if (approvalStatus && approvalStatus !== 'ALL')
      filter.approvalStatus = approvalStatus;

    const skip = (page - 1) * limit;

    const [transactions, total, [filteredCounts], [approvalCounts]] =
      await Promise.all([
        this.transactionModel
          .find(filter)
          .populate([
            {
              path: 'performedBy',
              select: 'name email role profileImageKey',
            },
            {
              path: 'supplier',
              select: 'name email address phoneNumber',
            },
            {
              path: 'customer',
              select: 'name email address phoneNumber',
            },
            {
              path: 'sourceWarehouse',
              select: 'name address description',
            },
            {
              path: 'destinationWarehouse',
              select: 'name address description',
            },
            {
              path: 'products.product',
              select: 'name category',
            },
            {
              path: 'products.variants.variant',
              select: 'sku attributes varinatImage',
            },
            {
              path: 'approvedBy',
              select: 'name profileImageKey',
            },
            {
              path: 'products.variants.batches.batch',
              select: 'items sourceWarehouse destinationWarehouse createdAt',
              populate: [
                {
                  path: 'sourceWarehouse',
                  select: 'name address description',
                },
                {
                  path: 'destinationWarehouse',
                  select: 'name address description',
                },
              ],
            },
          ])
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),

        this.transactionModel.countDocuments(filter),

        this.transactionModel.aggregate<{
          types: { _id: string; count: number }[];
          status: { _id: string; count: number }[];
        }>([
          { $match: filter },
          {
            $facet: {
              types: [
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
              status: [
                { $match: { shipment: { $exists: true, $ne: null } } },
                { $group: { _id: '$shipment', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ]),

        this.transactionModel.aggregate<{
          approval: { _id: string; count: number }[];
        }>([
          { $match: scopeMatch },
          {
            $facet: {
              approval: [
                { $group: { _id: '$approvalStatus', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ]),
      ]);

    for (const transaction of transactions) {
      const user = transaction.performedBy as unknown as User;
      if (user?.profileImageKey) {
        user.profileImage = await this.s3Service.getPresignedSignedUrl(
          user.profileImageKey,
        );
      }
    }

    for (const transaction of transactions) {
      const user = transaction.approvedBy as unknown as User;
      if (user?.profileImageKey) {
        user.profileImage = await this.s3Service.getPresignedSignedUrl(
          user.profileImageKey,
        );
      }
    }

    return {
      success: true,
      message: 'Warehouse transactions retrieved successfully',
      data: {
        transactions,
        counts: {
          types: filteredCounts?.types ?? [],
          status: filteredCounts?.status ?? [],
          approval: approvalCounts?.approval ?? [],
        },
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

      const warehouse = await this.warehouseModel.findById(warehouseId);

      if (!warehouse) {
        throw new BadRequestException('Warehouse not found');
      }

      const totalAmount = await this.calculateTransactionAmount(dto.products);

      const requiresApproval = totalAmount > warehouse.maxTransactionPriceLimit;

      const transaction = new this.transactionModel({
        type: TRANSACTION_TYPES.IN,
        supplier: new Types.ObjectId(dto.supplier),
        destinationWarehouse: warehouseId,
        notes: dto.notes,
        performedBy,
        totalAmount,
        requiresApproval,
        approvalStatus: requiresApproval
          ? TRANSACTION_STATUS.PENDING
          : TRANSACTION_STATUS.APPROVED,
        approvedBy: requiresApproval ? undefined : performedBy,
        approvedAt: requiresApproval ? undefined : new Date(),

        products: dto.products.map((product) => ({
          product: new Types.ObjectId(product.productId),
          variants: product.variants.map((variant) => ({
            variant: new Types.ObjectId(variant.variantId),
            quantity: variant.quantity,
            batches: [],
          })),
        })),
      });

      await transaction.save({ session });

      if (!requiresApproval) {
        await this.executeStockIn(dto, warehouseId, transaction, session);
      }

      await session.commitTransaction();

      await this.afterStockInActions(dto, transaction, warehouse, user);

      return {
        success: true,
        message: requiresApproval
          ? 'Transaction created and waiting for admin approval'
          : 'Stock-in transaction completed successfully',
        data: transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async executeStockIn(
    dto: StockInDto,
    warehouseId: Types.ObjectId,
    transaction: TransactionDocument,
    session: ClientSession,
  ) {
    for (const product of dto.products) {
      const batch = await this.batchModel.create(
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

      const batchId = batch[0]._id;

      for (const variant of product.variants) {
        const variantId = new Types.ObjectId(variant.variantId);

        await this.variantStockModel.findOneAndUpdate(
          {
            variantId,
            warehouseId,
          },
          { $inc: { quantity: variant.quantity } },
          { upsert: true, session },
        );

        const transactionProduct = transaction.products.find(
          (p) => p.product.toString() === product.productId,
        );

        const transactionVariant = transactionProduct?.variants.find(
          (v) => v.variant.toString() === variant.variantId,
        );

        if (transactionVariant) {
          transactionVariant.batches.push({
            batch: batchId,
            quantity: variant.quantity,
          });
        }
      }
    }

    await transaction.save({ session });
  }

  private async afterStockInActions(
    dto: StockInDto,
    transaction: TransactionDocument,
    warehouse: WarehouseDocument,
    user: UserDocument,
  ) {
    const supplier = await this.supplierModel
      .findById(dto.supplier)
      .select('name email')
      .lean();

    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const products = await this.buildProductLogItems(dto.products);

    await this.logsService.createLog({
      action: LOG_ACTION.STOCK_IN,
      entityType: LOG_ENTITY_TYPE.TRANSACTION,
      entityId: transaction._id.toString(),
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
            warehouse._id,
            transaction._id.toString(),
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
  }

  // Stock Out

  async createStockOut(dto: StockOutDto, user: UserDocument) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const warehouseId = new Types.ObjectId(dto.sourceWarehouse);
      const performedBy = new Types.ObjectId(user._id);
      const customerId = new Types.ObjectId(dto.customer);

      const warehouse = await this.warehouseModel.findById(warehouseId);

      if (!warehouse) {
        throw new BadRequestException('Warehouse not found');
      }

      const totalAmount = await this.calculateTransactionAmount(dto.products);

      const requiresApproval = totalAmount > warehouse.maxTransactionPriceLimit;

      const transaction = new this.transactionModel({
        type: TRANSACTION_TYPES.OUT,
        customer: customerId,
        shipment: SHIPMENT_TYPES.PENDING,
        sourceWarehouse: warehouseId,
        notes: dto.notes,
        performedBy,
        totalAmount,
        requiresApproval,
        approvalStatus: requiresApproval
          ? TRANSACTION_STATUS.PENDING
          : TRANSACTION_STATUS.APPROVED,
        approvedBy: requiresApproval ? undefined : performedBy,
        approvedAt: requiresApproval ? undefined : new Date(),

        products: dto.products.map((product) => ({
          product: new Types.ObjectId(product.productId),
          variants: product.variants.map((variant) => ({
            variant: new Types.ObjectId(variant.variantId),
            quantity: variant.quantity,
            batches: [],
          })),
        })),
      });

      await transaction.save({ session });

      if (!requiresApproval) {
        await this.executeStockOut(dto, warehouseId, transaction, session);
      }

      await session.commitTransaction();

      await this.afterStockOutActions(dto, transaction, warehouse, user);

      return {
        success: true,
        message: requiresApproval
          ? 'Transaction created and waiting for admin approval'
          : 'Stock-out transaction completed successfully',
        data: transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async executeStockOut(
    dto: StockOutDto,
    warehouseId: Types.ObjectId,
    transaction: TransactionDocument,
    session: ClientSession,
  ) {
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
          { $inc: { quantity: -requiredQty } },
          { session },
        );

        if (!stockUpdate.modifiedCount) {
          throw new BadRequestException(
            `Insufficient stock for variant ${variant.variantId}`,
          );
        }

        let remainingToDeduct = requiredQty;

        const batchBreakdown: BatchBreakdownType[] = [];

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

          if (!batchUpdate.modifiedCount) continue;

          remainingToDeduct -= deduct;

          batchBreakdown.push({
            batch: batch._id,
            quantity: deduct,
          });
        }

        if (remainingToDeduct) {
          throw new BadRequestException(
            'Stock inconsistency detected (FIFO failure)',
          );
        }

        const transactionProduct = transaction.products.find(
          (p) => p.product.toString() === product.productId,
        );

        const transactionVariant = transactionProduct?.variants.find(
          (v) => v.variant.toString() === variant.variantId,
        );

        if (transactionVariant) {
          transactionVariant.batches.push(...batchBreakdown);
        }
      }
    }

    await transaction.save({ session });
  }

  private async afterStockOutActions(
    dto: StockOutDto,
    transaction: TransactionDocument,
    warehouse: WarehouseDocument,
    user: UserDocument,
  ) {
    const customer = await this.customerModel
      .findById(dto.customer)
      .select('name email')
      .lean();

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    const products = await this.buildProductLogItems(dto.products);

    await this.logsService.createLog({
      action: LOG_ACTION.STOCK_OUT,
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

    const notificationPromises: Promise<void>[] = [];

    for (const product of dto.products) {
      for (const variant of product.variants) {
        notificationPromises.push(
          this.notificationTriggerService.notifyPendingShipment(
            new Types.ObjectId(product.productId),
            warehouse._id,
            transaction._id,
            variant.quantity,
            user._id,
          ),
        );
        notificationPromises.push(
          this.notificationTriggerService.notifyLowStock(
            product.productId,
            variant.variantId,
            warehouse._id,
            user._id,
          ),
        );
      }
    }

    Promise.all(notificationPromises).catch(() =>
      console.error('Notification failure'),
    );
  }

  // Stock Transfer

  async createTransfer(dto: TransferDto, user: UserDocument) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { sourceWarehouse, destinationWarehouse } = dto;

      if (sourceWarehouse === destinationWarehouse) {
        throw new BadRequestException(
          'Source and destination warehouses cannot be the same',
        );
      }

      const sourceWarehouseId = new Types.ObjectId(sourceWarehouse);
      const destinationWarehouseId = new Types.ObjectId(destinationWarehouse);
      const performedBy = new Types.ObjectId(user._id);

      const sourceWarehouseDoc =
        await this.warehouseModel.findById(sourceWarehouseId);

      const destinationWarehouseDoc = await this.warehouseModel.findById(
        destinationWarehouseId,
      );

      if (!sourceWarehouseDoc || !destinationWarehouseDoc) {
        throw new BadRequestException('Warehouse not found');
      }

      const totalAmount = await this.calculateTransactionAmount(dto.products);

      const requiresApproval =
        totalAmount > sourceWarehouseDoc.maxTransactionPriceLimit;

      const transaction = new this.transactionModel({
        type: TRANSACTION_TYPES.TRANSFER,
        sourceWarehouse: sourceWarehouseId,
        destinationWarehouse: destinationWarehouseId,
        notes: dto.notes,
        performedBy,
        totalAmount,
        requiresApproval,
        approvalStatus: requiresApproval
          ? TRANSACTION_STATUS.PENDING
          : TRANSACTION_STATUS.APPROVED,
        approvedBy: requiresApproval ? undefined : performedBy,
        approvedAt: requiresApproval ? undefined : new Date(),

        products: dto.products.map((product) => ({
          product: new Types.ObjectId(product.productId),
          variants: product.variants.map((variant) => ({
            variant: new Types.ObjectId(variant.variantId),
            quantity: variant.quantity,
            batches: [],
          })),
        })),
      });

      await transaction.save({ session });

      if (!requiresApproval) {
        await this.executeTransfer(
          dto,
          sourceWarehouseId,
          destinationWarehouseId,
          transaction,
          session,
        );
      }

      await session.commitTransaction();

      await this.afterTransferActions(
        dto,
        transaction,
        sourceWarehouseDoc,
        destinationWarehouseDoc,
        user,
      );

      return {
        success: true,
        message: requiresApproval
          ? 'Transfer created and waiting for approval'
          : 'Stock transfer completed successfully',
        data: transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async executeTransfer(
    dto: TransferDto,
    sourceWarehouseId: Types.ObjectId,
    destinationWarehouseId: Types.ObjectId,
    transaction: TransactionDocument,
    session: ClientSession,
  ) {
    for (const product of dto.products) {
      for (const variant of product.variants) {
        const variantId = new Types.ObjectId(variant.variantId);
        const requiredQty = variant.quantity;

        const sourceStock = await this.variantStockModel.findOne({
          variantId,
          warehouseId: sourceWarehouseId,
        });

        if (!sourceStock || sourceStock.quantity < requiredQty) {
          throw new BadRequestException(
            `Insufficient stock for variant ${variant.variantId}`,
          );
        }

        let remainingToMove = requiredQty;

        const batchBreakdown: BatchBreakdownType[] = [];

        const batches = await this.batchModel
          .find({
            destinationWarehouse: sourceWarehouseId,
            'items.variant': variantId,
            'items.remainingQuantity': { $gt: 0 },
          })
          .sort({ createdAt: 1 })
          .session(session);

        for (const batch of batches) {
          if (!remainingToMove) break;

          const item = batch.items.find(
            (i) =>
              i.variant.toString() === variantId.toString() &&
              i.remainingQuantity > 0,
          );

          if (!item) continue;

          const deduct = Math.min(item.remainingQuantity, remainingToMove);

          item.remainingQuantity -= deduct;
          remainingToMove -= deduct;

          await batch.save({ session });

          batchBreakdown.push({
            batch: batch._id,
            quantity: deduct,
          });
        }

        if (remainingToMove) {
          throw new BadRequestException('FIFO inconsistency detected');
        }

        sourceStock.quantity -= requiredQty;
        await sourceStock.save({ session });

        await this.variantStockModel.findOneAndUpdate(
          {
            variantId,
            warehouseId: destinationWarehouseId,
          },
          {
            $inc: { quantity: requiredQty },
          },
          {
            upsert: true,
            session,
          },
        );

        const newBatch = await this.batchModel.create(
          [
            {
              sourceWarehouse: sourceWarehouseId,
              destinationWarehouse: destinationWarehouseId,
              items: [
                {
                  variant: variantId,
                  quantity: requiredQty,
                  remainingQuantity: requiredQty,
                },
              ],
            },
          ],
          { session },
        );

        const transactionProduct = transaction.products.find(
          (p) => p.product.toString() === product.productId,
        );

        const transactionVariant = transactionProduct?.variants.find(
          (v) => v.variant.toString() === variant.variantId,
        );

        if (transactionVariant) {
          transactionVariant.batches.push(...batchBreakdown);

          transactionVariant.batches.push({
            batch: newBatch[0]._id,
            quantity: requiredQty,
          });
        }
      }
    }

    await transaction.save({ session });
  }

  private async afterTransferActions(
    dto: TransferDto,
    transaction: TransactionDocument,
    sourceWarehouse: WarehouseDocument,
    destinationWarehouse: WarehouseDocument,
    user: UserDocument,
  ) {
    const products = await this.buildProductLogItems(dto.products);

    await this.logsService.createLog({
      action: LOG_ACTION.STOCK_TRANSFER,
      entityType: LOG_ENTITY_TYPE.TRANSACTION,
      entityId: transaction._id.toString(),
      performedBy: user,
      metadata: {
        sourceWarehouse: {
          warehouseId: sourceWarehouse._id.toHexString(),
          name: sourceWarehouse.name,
        },
        destinationWarehouse: {
          warehouseId: destinationWarehouse._id.toHexString(),
          name: destinationWarehouse.name,
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
            sourceWarehouse._id,
            transaction._id.toString(),
            variant.quantity,
            NOTIFICATION_TYPES.STOCK_TRANSFER,
            user._id.toHexString(),
          ),
        );
        notificationPromises.push(
          this.notificationTriggerService.notifyLowStock(
            product.productId,
            variant.variantId,
            sourceWarehouse._id,
            user._id,
          ),
        );
      }
    }

    Promise.all(notificationPromises).catch(() =>
      console.error('Failed to send notification'),
    );
  }

  // Stock Adjustment

  async createAdjustment(dto: AdjustmentDto, user: UserDocument) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const { sourceWarehouse, reason } = dto;

      const warehouseId = new Types.ObjectId(sourceWarehouse);
      const performedBy = new Types.ObjectId(user._id);

      const warehouse = await this.warehouseModel.findById(warehouseId);

      if (!warehouse) {
        throw new BadRequestException('Warehouse not found');
      }

      const totalAmount = await this.calculateTransactionAmount(dto.products);

      const requiresApproval = totalAmount > warehouse.maxTransactionPriceLimit;

      const transaction = new this.transactionModel({
        type: TRANSACTION_TYPES.ADJUSTMENT,
        destinationWarehouse: warehouseId,
        reason,
        notes: dto.notes,
        performedBy,
        totalAmount,
        requiresApproval,
        approvalStatus: requiresApproval
          ? TRANSACTION_STATUS.PENDING
          : TRANSACTION_STATUS.APPROVED,
        approvedBy: requiresApproval ? undefined : performedBy,
        approvedAt: requiresApproval ? undefined : new Date(),

        products: dto.products.map((product) => ({
          product: new Types.ObjectId(product.productId),
          variants: product.variants.map((variant) => ({
            variant: new Types.ObjectId(variant.variantId),
            quantity: variant.quantity,
            batches: [],
          })),
        })),
      });

      await transaction.save({ session });

      if (!requiresApproval) {
        await this.executeAdjustment(dto, warehouseId, transaction, session);
      }

      await session.commitTransaction();

      await this.afterAdjustmentActions(dto, transaction, warehouse, user);

      return {
        success: true,
        message: requiresApproval
          ? 'Adjustment created and waiting for approval'
          : 'Stock adjustment recorded successfully',
        data: transaction,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async executeAdjustment(
    dto: AdjustmentDto,
    warehouseId: Types.ObjectId,
    transaction: TransactionDocument,
    session: ClientSession,
  ) {
    for (const product of dto.products) {
      for (const variant of product.variants) {
        const variantId = new Types.ObjectId(variant.variantId);
        const adjustmentQty = variant.quantity;

        const stock = await this.variantStockModel.findOne({
          variantId,
          warehouseId,
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

          const batchBreakdown: BatchBreakdownType[] = [];

          const batches = await this.batchModel
            .find({
              destinationWarehouse: warehouseId,
              'items.variant': variantId,
              'items.remainingQuantity': { $gt: 0 },
            })
            .sort({ createdAt: 1 })
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

            item.remainingQuantity -= deduct;
            remainingToDeduct -= deduct;

            await batch.save({ session });

            batchBreakdown.push({
              batch: batch._id,
              quantity: deduct,
            });
          }

          if (remainingToDeduct) {
            throw new BadRequestException('FIFO inconsistency detected');
          }

          stock.quantity -= absoluteQty;
          await stock.save({ session });

          const transactionProduct = transaction.products.find(
            (p) => p.product.toString() === product.productId,
          );

          const transactionVariant = transactionProduct?.variants.find(
            (v) => v.variant.toString() === variant.variantId,
          );

          if (transactionVariant) {
            transactionVariant.batches.push(...batchBreakdown);
          }
        }

        if (adjustmentQty > 0) {
          stock.quantity += adjustmentQty;
          await stock.save({ session });

          const batch = await this.batchModel.create(
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

          const transactionProduct = transaction.products.find(
            (p) => p.product.toString() === product.productId,
          );

          const transactionVariant = transactionProduct?.variants.find(
            (v) => v.variant.toString() === variant.variantId,
          );

          if (transactionVariant) {
            transactionVariant.batches.push({
              batch: batch[0]._id,
              quantity: adjustmentQty,
            });
          }
        }
      }
    }

    await transaction.save({ session });
  }

  private async afterAdjustmentActions(
    dto: AdjustmentDto,
    transaction: TransactionDocument,
    warehouse: WarehouseDocument,
    user: UserDocument,
  ) {
    const products = await this.buildProductLogItems(dto.products);

    await this.logsService.createLog({
      action: LOG_ACTION.STOCK_ADJUSTED,
      entityType: LOG_ENTITY_TYPE.TRANSACTION,
      entityId: transaction._id.toString(),
      performedBy: user,
      metadata: {
        destinationWarehouse: {
          warehouseId: warehouse._id.toHexString(),
          name: warehouse.name,
        },
        reason: dto.reason,
        products,
      },
    });

    const notificationPromises: Promise<void>[] = [];

    for (const product of dto.products) {
      for (const variant of product.variants) {
        notificationPromises.push(
          this.notificationTriggerService.notifyTransaction(
            new Types.ObjectId(product.productId),
            warehouse._id,
            transaction._id.toString(),
            variant.quantity,
            NOTIFICATION_TYPES.STOCK_ADJUSTMENT,
            user._id.toHexString(),
          ),
        );

        notificationPromises.push(
          this.notificationTriggerService.notifyLowStock(
            product.productId,
            variant.variantId,
            warehouse._id,
            user._id,
          ),
        );
      }
    }

    Promise.all(notificationPromises).catch(() =>
      console.error('Notification failed'),
    );
  }

  // other Operations

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

  async approveTransaction(transactionId: string, adminId: Types.ObjectId) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const transaction = await this.transactionModel
        .findById(transactionId)
        .session(session);

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (!transaction.requiresApproval) {
        throw new BadRequestException('Transaction does not require approval');
      }

      if (transaction.approvalStatus === TRANSACTION_STATUS.APPROVED) {
        throw new BadRequestException('Transaction already approved');
      }

      const dtoProducts = transaction.products.map((p) => ({
        productId: p.product.toString(),
        variants: p.variants.map((v) => ({
          variantId: v.variant.toString(),
          quantity: v.quantity,
        })),
      }));

      if (transaction.type === TRANSACTION_TYPES.IN) {
        await this.executeStockIn(
          {
            products: dtoProducts,
            supplier: transaction.supplier?.toHexString() as string,
            destinationWarehouse:
              transaction.destinationWarehouse?.toHexString() as string,
          },
          transaction.destinationWarehouse as Types.ObjectId,
          transaction,
          session,
        );
      } else if (transaction.type === TRANSACTION_TYPES.OUT) {
        await this.executeStockOut(
          {
            products: dtoProducts,
            customer: transaction.customer?.toHexString() as string,
            sourceWarehouse: transaction.sourceWarehouse?.toHexString(),
          } as StockOutDto,
          transaction.sourceWarehouse as Types.ObjectId,
          transaction,
          session,
        );
      } else if (transaction.type === TRANSACTION_TYPES.TRANSFER) {
        await this.executeTransfer(
          {
            products: dtoProducts,
            sourceWarehouse: transaction.sourceWarehouse?.toHexString(),
            destinationWarehouse:
              transaction.destinationWarehouse?.toHexString(),
          } as TransferDto,
          transaction.sourceWarehouse as Types.ObjectId,
          transaction.destinationWarehouse as Types.ObjectId,
          transaction,
          session,
        );
      } else {
        await this.executeAdjustment(
          {
            sourceWarehouse: transaction.destinationWarehouse?.toString(),
            products: transaction.products.map((p) => ({
              productId: p.product.toString(),
              variants: p.variants.map((v) => ({
                variantId: v.variant.toString(),
                quantity: v.quantity,
              })),
            })),
            reason: transaction.reason,
          } as AdjustmentDto,
          transaction.destinationWarehouse as Types.ObjectId,
          transaction,
          session,
        );
      }

      transaction.approvalStatus = TRANSACTION_STATUS.APPROVED;
      transaction.approvedBy = adminId;
      transaction.approvedAt = new Date();

      await transaction.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        message: 'Transaction approved and stock updated',
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async rejectTransaction(transactionId: string, adminId: Types.ObjectId) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const transaction = await this.transactionModel
        .findById(transactionId)
        .session(session);

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (!transaction.requiresApproval) {
        throw new BadRequestException('Transaction does not require approval');
      }

      if (transaction.approvalStatus === TRANSACTION_STATUS.REJECTED) {
        throw new BadRequestException('Transaction already rejected');
      }

      if (transaction.approvalStatus === TRANSACTION_STATUS.APPROVED) {
        throw new BadRequestException(
          'Approved transaction cannot be rejected',
        );
      }

      // ✅ Only update status
      transaction.approvalStatus = TRANSACTION_STATUS.REJECTED;
      transaction.approvedBy = adminId;
      transaction.approvedAt = new Date();

      await transaction.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        message: 'Transaction rejected successfully',
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  private async calculateTransactionAmount(
    products: ProductItemDto[],
  ): Promise<number> {
    const variantIds = products.flatMap((p) =>
      p.variants.map((v) => new Types.ObjectId(v.variantId)),
    );

    const variants = await this.variantModel
      .find({ _id: { $in: variantIds } })
      .select('price')
      .lean();

    const priceMap = new Map(variants.map((v) => [v._id.toString(), v.price]));

    let total = 0;

    for (const product of products) {
      for (const variant of product.variants) {
        const price = priceMap.get(variant.variantId) || 0;
        total += price * variant.quantity;
      }
    }

    return total;
  }
}
