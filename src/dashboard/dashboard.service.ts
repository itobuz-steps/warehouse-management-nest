import { Injectable, BadRequestException } from '@nestjs/common';
import mongoose, { Model, QueryFilter, Types } from 'mongoose';
import { Quantity } from 'src/quantity/entities/quantity.entity';

import { subDays, eachDayOfInterval, format } from 'date-fns';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from 'src/products/entities/product.entity';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';
import { SHIPMENT_TYPES } from 'src/transaction/constants/shipmentConstants';
import { ExcelService } from 'src/helper/excelGenerator';
import {
  TopProductItem,
  InventoryByCategoryAggItem,
  ProductTransactionDay,
  SalesOverview,
  PurchaseOverview,
  InventoryOverview,
  TodayShipmentOverview,
  LowStockProduct,
  TopSellingProduct,
  ProfitLossItem,
} from './types/dashboard.data.type';
import { defaultDataLimit, TIME_RANGE, TIME_ZONE } from './dashboard.constants';
import { VariantStock } from 'src/variant-stock/schemas/variant-stock.schema';
import config from '../config/config.service';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { USER_TYPES } from 'src/auth/userType';

@Injectable()
export class DashboardService {
  constructor(
    private excel: ExcelService,

    @InjectModel(Quantity.name)
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

    @InjectModel(VariantStock.name)
    private readonly variantStockModel: Model<VariantStock>,

    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<Warehouse>,
  ) {}

  toObjectId(id?: string): mongoose.Types.ObjectId | undefined {
    if (!id || !Types.ObjectId.isValid(id)) {
      return undefined;
    }

    return new mongoose.Types.ObjectId(id);
  }

  private async resolveWarehouseIds(
    user: UserDocument,
    warehouseId?: string,
  ): Promise<Types.ObjectId[] | null> {
    if (user.role !== USER_TYPES.MANAGER) {
      return warehouseId ? [new Types.ObjectId(warehouseId)] : null;
    }

    const warehouses = await this.warehouseModel
      .find({ managerIds: user._id })
      .select('_id');

    const ids = warehouses.map((w) => w._id);

    if (!ids.length) {
      return [];
    }

    if (warehouseId) {
      const wid = new Types.ObjectId(warehouseId);
      return ids.some((id) => id.equals(wid)) ? [wid] : [];
    }

    return ids;
  }

  // ----------------------------------------------

  async getTopFiveProductsData(
    id: string | undefined,
    user: UserDocument,
  ): Promise<TopProductItem[]> {
    const ids = await this.resolveWarehouseIds(user, id);
    const warehouseMatch =
      ids !== null
        ? { warehouseId: ids.length ? { $in: ids } : { $exists: false } }
        : {};

    return this.variantStockModel.aggregate([
      { $match: warehouseMatch },
      {
        $group: {
          _id: '$productId',
          totalVariants: { $sum: 1 }, // total variant entries
          totalQuantity: { $sum: '$quantity' }, // sum of all variant quantities
        },
      },

      {
        $sort: { totalQuantity: -1 }, // sort by total stock (better metric)
      },

      {
        $limit: defaultDataLimit,
      },

      // Join product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },

      {
        $unwind: '$product',
      },

      {
        $match: {
          'product.isArchived': false,
        },
      },

      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id' },
          productName: '$product.name',
          category: '$product.category',
          totalVariants: 1,
          totalQuantity: 1,
        },
      },
    ]);
  }

  async getTopFiveProducts(id: string | undefined, user: UserDocument) {
    return this.getTopFiveProductsData(id, user);
  }

  async generateTopFiveProductsExcel(id: string, user: UserDocument) {
    const data = await this.getTopFiveProductsData(id, user);
    return this.excel.generateTopFiveProductsExcel(data);
  }

  // ----------------------------------------------

  async getInventoryByCategoryData(
    id: string | undefined,
    user: UserDocument,
  ): Promise<InventoryByCategoryAggItem[]> {
    const ids = await this.resolveWarehouseIds(user, id);
    const warehouseMatch =
      ids !== null
        ? { warehouseId: ids.length ? { $in: ids } : { $exists: false } }
        : {};

    return this.variantStockModel.aggregate<InventoryByCategoryAggItem>([
      { $match: warehouseMatch },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isArchived': false } },
      {
        $group: {
          _id: '$product.category',
          totalProducts: { $sum: 1 },
        },
      },
      { $sort: { totalProducts: -1 } },
    ]);
  }

  async getInventoryByCategory(id: string | undefined, user: UserDocument) {
    const data = await this.getInventoryByCategoryData(id, user);
    return { message: 'Data fetched successfully', success: true, data };
  }

  async generateInventoryByCategoryExcel(id: string, user: UserDocument) {
    const data = await this.getInventoryByCategoryData(id, user);
    return this.excel.generateInventoryByCategoryExcel(data);
  }

  // ----------------------------------------------

  async getProductTransactionData(
    id: string | undefined,
    user: UserDocument,
  ): Promise<ProductTransactionDay[]> {
    const ids = await this.resolveWarehouseIds(user, id);

    const warehouseFilter =
      ids === null
        ? {}
        : ids.length === 0
          ? { _id: { $exists: false } }
          : {
              $or: [
                {
                  type: TRANSACTION_TYPES.IN,
                  destinationWarehouse: { $in: ids },
                },
                { type: TRANSACTION_TYPES.OUT, sourceWarehouse: { $in: ids } },
                {
                  type: TRANSACTION_TYPES.TRANSFER,
                  $or: [
                    { sourceWarehouse: { $in: ids } },
                    { destinationWarehouse: { $in: ids } },
                  ],
                },
                {
                  type: TRANSACTION_TYPES.ADJUSTMENT,
                  sourceWarehouse: { $in: ids },
                },
              ],
            };

    return this.buildProductTransactionAggregation(warehouseFilter);
  }

  async getProductTransaction(id: string | undefined, user: UserDocument) {
    const data = await this.getProductTransactionData(id, user);
    return { message: 'Data fetched successfully', success: true, data };
  }

  async generateProductTransactionExcel(id: string, user: UserDocument) {
    const data = await this.getProductTransactionData(id, user);
    return this.excel.generateProductTransactionExcel(data);
  }

  private async buildProductTransactionAggregation(
    warehouseFilter: Record<string, unknown>,
  ): Promise<ProductTransactionDay[]> {
    const start = subDays(new Date(), 6);
    const end = new Date();

    // template for last 7 days
    const sevenDays: ProductTransactionDay[] = eachDayOfInterval({
      start,
      end,
    }).map((d) => ({
      _id: format(d, 'dd-MM-yyyy'),
      IN: 0,
      OUT: 0,
      TRANSFER: 0,
      ADJUSTMENT: 0,
    }));

    const daysTransaction =
      await this.transactionModel.aggregate<ProductTransactionDay>([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            ...warehouseFilter,
          },
        },
        {
          $group: {
            _id: {
              day: {
                $dateToString: { format: '%d-%m-%Y', date: '$createdAt' },
              },
              type: '$type',
            },
            total: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.day',
            IN: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', TRANSACTION_TYPES.IN] },
                  '$total',
                  0,
                ],
              },
            },
            OUT: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', TRANSACTION_TYPES.OUT] },
                  '$total',
                  0,
                ],
              },
            },
            TRANSFER: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', TRANSACTION_TYPES.TRANSFER] },
                  '$total',
                  0,
                ],
              },
            },
            ADJUSTMENT: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', TRANSACTION_TYPES.ADJUSTMENT] },
                  '$total',
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

    daysTransaction.forEach((item) => {
      const day = sevenDays.find((d) => d._id === item._id);
      if (day) {
        day.IN = item.IN;
        day.OUT = item.OUT;
        day.TRANSFER = item.TRANSFER;
        day.ADJUSTMENT = item.ADJUSTMENT;
      }
    });

    return sevenDays;
  }

  async getTransactionStats(id: string | undefined, user: UserDocument) {
    const ids = await this.resolveWarehouseIds(user, id);
    const warehouseFilter =
      ids !== null ? (ids.length ? { $in: ids } : { $exists: false }) : null;

    const srcMatch = warehouseFilter
      ? { sourceWarehouse: warehouseFilter }
      : {};
    const dstMatch = warehouseFilter
      ? { destinationWarehouse: warehouseFilter }
      : {};
    const invMatch = warehouseFilter ? { warehouseId: warehouseFilter } : {};

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [sales, purchase, inventory, todayShipment] = await Promise.all([
      this.transactionModel.aggregate<SalesOverview>([
        { $match: { type: TRANSACTION_TYPES.OUT, ...srcMatch } },
        {
          $group: {
            _id: null,
            totalSalesAmount: { $sum: '$totalAmount' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),

      this.transactionModel.aggregate<PurchaseOverview>([
        { $match: { type: TRANSACTION_TYPES.IN, ...dstMatch } },
        {
          $group: {
            _id: null,
            totalPurchaseAmount: { $sum: '$totalAmount' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),

      this.variantStockModel.aggregate<InventoryOverview>([
        { $match: { quantity: { $gt: 0 }, ...invMatch } },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        { $match: { 'product.isArchived': false } },
        {
          $group: { _id: null, totalVariants: { $sum: 1 } },
        },
        { $project: { _id: 0, totalVariants: 1 } },
      ]),

      this.transactionModel.aggregate<TodayShipmentOverview>([
        {
          $match: {
            type: TRANSACTION_TYPES.OUT,
            createdAt: { $gte: todayStart },
            ...srcMatch,
          },
        },
        { $group: { _id: null, quantity: { $sum: 1 } } },
        { $project: { _id: 0, quantity: 1 } },
      ]),
    ]);

    return {
      message: 'Data fetched successfully',
      success: true,
      data: {
        sales: sales[0] ?? { totalSalesAmount: 0, totalTransactions: 0 },
        purchase: purchase[0] ?? {
          totalPurchaseAmount: 0,
          totalTransactions: 0,
        },
        inventory: inventory[0] ?? { totalVariants: 0 },
        todayShipment: todayShipment[0] ?? { quantity: 0 },
      },
    };
  }

  async getLowStockProducts(id: string | undefined, user: UserDocument) {
    const stockLimit = Number(config().STOCK_LIMIT) || 20;

    const ids = await this.resolveWarehouseIds(user, id);
    const warehouseMatch =
      ids !== null
        ? { warehouseId: ids.length ? { $in: ids } : { $exists: false } }
        : {};

    const lowStockProducts =
      await this.variantStockModel.aggregate<LowStockProduct>([
        { $match: warehouseMatch },
        { $group: { _id: '$productId', totalQuantity: { $sum: '$quantity' } } },
        { $match: { totalQuantity: { $lt: stockLimit } } },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        { $match: { 'product.isArchived': false } },
        {
          $project: {
            _id: 0,
            productId: '$product._id',
            productName: '$product.name',
            quantity: '$totalQuantity',
            category: '$product.category',
          },
        },
      ]);

    return {
      message: 'Low stock products retrieved successfully',
      success: true,
      data: lowStockProducts,
    };
  }

  async getTopSellingProducts(
    id: string | undefined,
    limit = defaultDataLimit,
    user: UserDocument,
  ) {
    const ids = await this.resolveWarehouseIds(user, id);
    const srcMatch =
      ids !== null
        ? { sourceWarehouse: ids.length ? { $in: ids } : { $exists: false } }
        : {};

    const topSellingProducts =
      await this.transactionModel.aggregate<TopSellingProduct>([
        { $match: { type: TRANSACTION_TYPES.OUT, ...srcMatch } },
        { $unwind: '$products' },
        { $unwind: '$products.variants' },
        {
          $lookup: {
            from: 'variants',
            localField: 'products.variants.variant',
            foreignField: '_id',
            as: 'variant',
          },
        },
        { $unwind: '$variant' },
        {
          $lookup: {
            from: 'products',
            localField: 'products.product',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        { $match: { 'product.isArchived': false } },
        {
          $addFields: {
            revenue: {
              $multiply: ['$products.variants.quantity', '$variant.price'],
            },
          },
        },
        {
          $group: {
            _id: '$product._id',
            productName: { $first: '$product.name' },
            category: { $first: '$product.category' },
            variantImage: { $first: '$variant.variantImage' },
            totalSoldQuantity: { $sum: '$products.variants.quantity' },
            totalSalesAmount: { $sum: '$revenue' },
          },
        },
        { $sort: { totalSalesAmount: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            productName: 1,
            category: 1,
            totalSoldQuantity: 1,
            totalSalesAmount: 1,
            variantImage: 1,
          },
        },
      ]);

    return {
      message: 'Top selling products retrieved successfully',
      success: true,
      data: topSellingProducts,
    };
  }

  async getMostCancelledProducts(
    id: string | undefined,
    options:
      | { startDate?: string; endDate?: string; limit?: number }
      | undefined,
    user: UserDocument,
  ) {
    const { startDate, endDate } = options || {};
    const limit = Number(options?.limit || defaultDataLimit);

    const ids = await this.resolveWarehouseIds(user, id);
    const srcMatch =
      ids !== null
        ? { sourceWarehouse: ids.length ? { $in: ids } : { $exists: false } }
        : {};

    const match: QueryFilter<Transaction> = {
      shipment: SHIPMENT_TYPES.CANCELLED,
      ...srcMatch,
    };

    if (startDate || endDate) {
      match.createdAt = {};

      if (startDate) {
        match.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        match.createdAt.$lte = d;
      }
    }

    const mostCancelledProducts = await this.transactionModel.aggregate([
      { $match: match },
      { $unwind: '$products' },
      { $unwind: '$products.variants' },
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isArchived': false } },
      {
        $group: {
          _id: '$product._id',
          productName: { $first: '$product.name' },
          category: { $first: '$product.category' },
          totalCancelledQuantity: { $sum: '$products.variants.quantity' },
        },
      },
      { $sort: { totalCancelledQuantity: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: 1,
          category: 1,
          totalCancelledQuantity: 1,
        },
      },
    ]);

    return {
      message: 'Most cancelled products retrieved successfully',
      success: true,
      data: mostCancelledProducts,
    };
  }

  async getMostAdjustedProducts(
    id: string | undefined,
    options: { limit?: number } | undefined,
    user: UserDocument,
  ) {
    const ids = await this.resolveWarehouseIds(user, id);
    const dstMatch =
      ids !== null
        ? {
            destinationWarehouse: ids.length
              ? { $in: ids }
              : { $exists: false },
          }
        : {};

    const limit = Number(options?.limit || defaultDataLimit);

    const mostAdjustedProducts = await this.transactionModel.aggregate([
      { $match: { type: TRANSACTION_TYPES.ADJUSTMENT, ...dstMatch } },
      { $unwind: '$products' },
      { $unwind: '$products.variants' },
      {
        $group: {
          _id: '$products.product',
          totalAdjustedQuantity: { $sum: '$products.variants.quantity' },
          reason: { $first: '$reason' },
        },
      },
      { $sort: { totalAdjustedQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isArchived': false } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$product.name',
          category: '$product.category',
          totalAdjustedQuantity: 1,
          reason: 1,
        },
      },
    ]);

    return {
      message: 'Most adjusted products retrieved successfully',
      success: true,
      data: mostAdjustedProducts,
    };
  }

  async getProfitLoss(
    query: { period?: string; id?: string; from?: string; to?: string },
    user: UserDocument,
  ) {
    const ids = await this.resolveWarehouseIds(user, query.id);

    const period: TIME_RANGE = Object.values(TIME_RANGE).includes(
      query.period as TIME_RANGE,
    )
      ? (query.period as TIME_RANGE)
      : TIME_RANGE.MONTH;

    const groupByHour = period === TIME_RANGE.HOURS_24;
    const groupByMonth =
      period === TIME_RANGE.MONTHS_3 ||
      period === TIME_RANGE.MONTHS_6 ||
      period === TIME_RANGE.MONTHS_12;

    let start: Date, end: Date, totalDays: number;
    const now = new Date();

    if (query.from && query.to) {
      start = new Date(query.from);
      start.setHours(0, 0, 0, 0);
      end = new Date(query.to);
      end.setHours(23, 59, 59, 999);

      if (start > end)
        throw new BadRequestException('`from` date must be before `to` date');

      totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    } else {
      if (
        ![
          TIME_RANGE.WEEK as string,
          TIME_RANGE.MONTH as string,
          TIME_RANGE.MONTHS_3 as string,
          TIME_RANGE.MONTHS_6 as string,
          TIME_RANGE.MONTHS_12 as string,
          TIME_RANGE.HOURS_24 as string,
        ].includes(period)
      ) {
        throw new BadRequestException(
          'Invalid period. Allowed values: week, month, 3months, 6months, 12months, 24hours',
        );
      }

      if (period === TIME_RANGE.HOURS_24) {
        end = new Date();
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        totalDays = 1;
      } else {
        const PERIOD_DAYS_MAP: Record<TIME_RANGE, number> = {
          [TIME_RANGE.WEEK]: 7,
          [TIME_RANGE.MONTH]: 30,
          [TIME_RANGE.MONTHS_3]: 90,
          [TIME_RANGE.MONTHS_6]: 180,
          [TIME_RANGE.MONTHS_12]: 365,
          [TIME_RANGE.HOURS_24]: 1,
        };

        totalDays = PERIOD_DAYS_MAP[period];
        start = new Date();
        start.setDate(start.getDate() - (totalDays - 1));
        start.setHours(0, 0, 0, 0);
        end = now;
      }
    }

    const match: QueryFilter<Transaction> = {
      createdAt: { $gte: start, $lte: end },
    };

    if (ids !== null) {
      if (ids.length) {
        match.$or = [
          { sourceWarehouse: { $in: ids } },
          { destinationWarehouse: { $in: ids } },
        ];
      } else {
        match._id = { $exists: false };
      }
    }

    const dbData = await this.transactionModel.aggregate<ProfitLossItem>([
      { $match: match },
      {
        $group: {
          _id: {
            sortKey: {
              $dateToString: {
                format: groupByHour
                  ? '%Y-%m-%d %H:00'
                  : groupByMonth
                    ? '%Y-%m'
                    : '%Y-%m-%d',
                date: '$createdAt',
                timezone: TIME_ZONE,
              },
            },
            label: {
              $dateToString: {
                format: groupByHour
                  ? '%d-%m-%Y %H:00'
                  : groupByMonth
                    ? '%m-%Y'
                    : '%d-%m-%Y',
                date: '$createdAt',
                timezone: TIME_ZONE,
              },
            },
            type: '$type',
          },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $group: {
          _id: { sortKey: '$_id.sortKey', label: '$_id.label' },
          profit: {
            $sum: {
              $cond: [
                { $eq: ['$_id.type', TRANSACTION_TYPES.OUT] },
                '$totalAmount',
                0,
              ],
            },
          },
          loss: {
            $sum: {
              $cond: [
                { $eq: ['$_id.type', TRANSACTION_TYPES.ADJUSTMENT] },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
      { $sort: { '_id.sortKey': 1 } },
      {
        $project: {
          _id: 0,
          label: '$_id.label',
          profit: { $round: ['$profit', 2] },
          loss: { $round: ['$loss', 2] },
          net: { $round: [{ $subtract: ['$profit', '$loss'] }, 2] },
        },
      },
    ]);

    return { success: true, message: 'Profit & Loss Analytics', data: dbData };
  }
}
