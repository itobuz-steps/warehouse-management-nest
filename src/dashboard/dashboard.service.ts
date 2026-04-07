import { Injectable, BadRequestException } from '@nestjs/common';
import mongoose, { Model, QueryFilter } from 'mongoose';
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
  ) {}

  toObjectId(id?: string): mongoose.Types.ObjectId | undefined {
    if (!id || id === 'undefined' || id === 'null' || id === 'all')
      return undefined;
    return new mongoose.Types.ObjectId(id);
  }

  // ----------------------------------------------

  async getTopFiveProductsData(id?: string) {
    const warehouseId = this.toObjectId(id);
    const warehouseMatch = warehouseId ? { warehouseId } : {};

    const data: TopProductItem[] = await this.variantStockModel.aggregate([
      {
        $match: warehouseMatch,
      },

      // Aggregate per product
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

    return data;
  }

  async getTopFiveProducts(id?: string) {
    const data = await this.getTopFiveProductsData(id);
    return data;
  }

  async generateTopFiveProductsExcel(id: string) {
    const data = await this.getTopFiveProductsData(id);
    return this.excel.generateTopFiveProductsExcel(data);
  }

  // ----------------------------------------------

  async getInventoryByCategoryData(
    id?: string,
  ): Promise<InventoryByCategoryAggItem[]> {
    const warehouseId = this.toObjectId(id);
    const warehouseMatch = warehouseId ? { warehouseId } : {};

    const productsCategory =
      await this.variantStockModel.aggregate<InventoryByCategoryAggItem>([
        {
          $match: warehouseMatch,
        },

        {
          $lookup: {
            from: 'products',
            localField: 'productId',
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
          $group: {
            _id: '$product.category',
            totalProducts: { $sum: 1 },
          },
        },

        {
          $sort: { totalProducts: -1 },
        },
      ]);

    return productsCategory;
  }

  async generateInventoryByCategoryExcel(id: string) {
    const data = await this.getInventoryByCategoryData(id);
    return this.excel.generateInventoryByCategoryExcel(data);
  }

  async getInventoryByCategory(id?: string) {
    const productsCategory = await this.getInventoryByCategoryData(id);

    return {
      message: 'Data fetched successfully',
      success: true,
      data: productsCategory,
    };
  }

  // ----------------------------------------------

  async getProductTransactionData(
    id?: string,
  ): Promise<ProductTransactionDay[]> {
    const warehouseId = this.toObjectId(id);

    // This one has a special $or match structure:
    const warehouseFilter = warehouseId
      ? {
          $or: [
            { type: TRANSACTION_TYPES.IN, destinationWarehouse: warehouseId },
            { type: TRANSACTION_TYPES.OUT, sourceWarehouse: warehouseId },
          ],
        }
      : {};

    const start = subDays(new Date(), 6);
    const end = new Date();

    // template for last 7 days
    const sevenDays: ProductTransactionDay[] = eachDayOfInterval({
      start,
      end,
    }).map((d) => ({
      _id: format(d, 'yyyy-MM-dd'),
      IN: 0,
      OUT: 0,
    }));

    const daysTransaction =
      await this.transactionModel.aggregate<ProductTransactionDay>([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            ...warehouseFilter,
          },
        },

        {
          $group: {
            _id: {
              day: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
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
          },
        },

        { $sort: { _id: 1 } },
      ]);

    daysTransaction.forEach((item) => {
      const day = sevenDays.find((d) => d._id === item._id);
      if (day) {
        day.IN = item.IN;
        day.OUT = item.OUT;
      }
    });

    return sevenDays;
  }

  async generateProductTransactionExcel(id: string) {
    const transactionDetails = await this.getProductTransactionData(id);
    return this.excel.generateProductTransactionExcel(transactionDetails);
  }

  async getProductTransaction(id?: string) {
    const transactionDetails = await this.getProductTransactionData(id);

    return {
      message: 'Data fetched successfully',
      success: true,
      data: transactionDetails,
    };
  }

  // ---------------------------------------------------

  async getTransactionStats(id?: string) {
    const warehouseId = this.toObjectId(id);
    const srcMatch = warehouseId ? { sourceWarehouse: warehouseId } : {};
    const dstMatch = warehouseId ? { destinationWarehouse: warehouseId } : {};
    // Sales Overview
    const sales = await this.transactionModel.aggregate<SalesOverview>([
      {
        $match: {
          type: TRANSACTION_TYPES.OUT,
          ...srcMatch,
        },
      },
      {
        $group: {
          _id: null,
          totalSalesAmount: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    // Purchase Overview
    const purchase = await this.transactionModel.aggregate<PurchaseOverview>([
      {
        $match: {
          type: TRANSACTION_TYPES.IN,
          ...dstMatch,
        },
      },
      {
        $group: {
          _id: null,
          totalPurchaseAmount: { $sum: '$totalAmount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    // Inventory Overview
    const inventory = await this.variantStockModel.aggregate<InventoryOverview>(
      [
        {
          $match: {
            quantity: { $gt: 0 },
            ...(warehouseId ? { warehouseId } : {}),
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        {
          $match: {
            'product.isArchived': false,
          },
        },
        {
          $group: {
            _id: null,
            totalVariants: { $sum: 1 }, // count variants instead of quantity
          },
        },
        {
          $project: {
            _id: 0,
            totalVariants: 1,
          },
        },
      ],
    );

    // Today's Shipment Count
    const dayStarting = new Date();
    dayStarting.setHours(0, 0, 0, 0);

    const todayShipment =
      await this.transactionModel.aggregate<TodayShipmentOverview>([
        {
          $match: {
            type: TRANSACTION_TYPES.OUT,
            createdAt: { $gte: dayStarting },
            ...srcMatch,
          },
        },
        {
          $group: {
            _id: null,
            quantity: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            quantity: 1,
          },
        },
      ]);

    return {
      message: 'Data fetched successfully',
      success: true,
      data: {
        sales: sales[0] ?? {
          totalSalesAmount: 0,
          totalTransactions: 0,
        },
        purchase: purchase[0] ?? {
          totalPurchaseAmount: 0,
          totalTransactions: 0,
        },
        inventory: inventory[0] ?? { totalQuantity: 0 },
        todayShipment: todayShipment[0] ?? { quantity: 0 },
      },
    };
  }

  async getLowStockProducts(id?: string) {
    const stockLimit = Number(config().STOCK_LIMIT) || 20;

    const warehouseId = this.toObjectId(id);
    const warehouseMatch = warehouseId ? { warehouseId } : {};

    const lowStockProducts =
      await this.variantStockModel.aggregate<LowStockProduct>([
        { $match: warehouseMatch },
        {
          $group: {
            _id: '$productId',
            totalQuantity: { $sum: '$quantity' },
          },
        },

        {
          $match: {
            totalQuantity: { $lt: stockLimit },
          },
        },

        // Lookup product details
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },

        { $unwind: '$product' },

        {
          $match: {
            'product.isArchived': false,
          },
        },

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

  async getTopSellingProducts(id?: string, limit = defaultDataLimit) {
    const warehouseId = this.toObjectId(id);
    const srcMatch = warehouseId ? { sourceWarehouse: warehouseId } : {};

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

        {
          $match: {
            'product.isArchived': false,
          },
        },

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

            totalSoldQuantity: {
              $sum: '$products.variants.quantity',
            },

            totalSalesAmount: {
              $sum: '$revenue',
            },
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
    id?: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
  ) {
    const { startDate, endDate } = options || {};

    const warehouseId = this.toObjectId(id);

    const match: QueryFilter<Transaction> = {
      shipment: SHIPMENT_TYPES.CANCELLED,
      ...(warehouseId ? { sourceWarehouse: warehouseId } : {}),
    };
    const limit = Number(options?.limit || defaultDataLimit);

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

      {
        $match: {
          'product.isArchived': false,
        },
      },

      {
        $group: {
          _id: '$product._id',
          productName: { $first: '$product.name' },
          category: { $first: '$product.category' },

          totalCancelledQuantity: {
            $sum: '$products.variants.quantity',
          },
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
    id?: string,
    options?: {
      limit?: number;
    },
  ) {
    const warehouseId = this.toObjectId(id);
    const dstMatch = warehouseId ? { destinationWarehouse: warehouseId } : {};

    const limit = Number(options?.limit || defaultDataLimit);

    const mostAdjustedProducts = await this.transactionModel.aggregate([
      { $match: { type: TRANSACTION_TYPES.ADJUSTMENT, ...dstMatch } },

      { $unwind: '$products' },

      { $unwind: '$products.variants' },

      {
        $group: {
          _id: '$products.product',
          totalAdjustedQuantity: {
            $sum: '$products.variants.quantity',
          },
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

      {
        $match: {
          'product.isArchived': false,
        },
      },

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

  async getProfitLoss(query: {
    period?: string;
    id?: string;
    from?: string;
    to?: string;
  }) {
    const warehouseId = this.toObjectId(query.id);
    const period = query.period ?? TIME_RANGE.MONTH;
    const from = query.from;
    const to = query.to;

    let start: Date;
    let end: Date;
    let totalDays: number;
    const now = new Date();

    const groupByMonth =
      period === '3months' || period === '6months' || period === '12months';

    if (from && to) {
      start = new Date(from);
      start.setHours(0, 0, 0, 0);
      end = new Date(to);
      end.setHours(23, 59, 59, 999);

      if (start > end) {
        throw new BadRequestException('`from` date must be before `to` date');
      }

      totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    } else {
      if (
        ![
          TIME_RANGE.WEEK as string,
          TIME_RANGE.MONTH as string,
          '3months',
          '6months',
          '12months',
        ].includes(period)
      ) {
        throw new BadRequestException(
          'Invalid period. Allowed values: week, month, 3months, 6months, 12months',
        );
      }

      if (period === '3months') {
        totalDays = 90;
      } else if (period === '6months') {
        totalDays = 180;
      } else if (period === '12months') {
        totalDays = 365;
      } else {
        totalDays = period === (TIME_RANGE.MONTH as string) ? 30 : 7;
      }

      start = new Date();
      start.setDate(start.getDate() - (totalDays - 1));
      start.setHours(0, 0, 0, 0);
      end = now;
    }

    const match: QueryFilter<Transaction> = {
      createdAt: { $gte: start, $lte: end },
    };

    if (warehouseId) {
      match.$or = [
        { sourceWarehouse: warehouseId },
        { destinationWarehouse: warehouseId },
      ];
    }

    const dbData = await this.transactionModel.aggregate<ProfitLossItem>([
      { $match: match },

      {
        $group: {
          _id: {
            sortKey: {
              $dateToString: {
                format: groupByMonth ? '%Y-%m' : '%Y-%m-%d',
                date: '$createdAt',
                timezone: TIME_ZONE,
              },
            },
            label: {
              $dateToString: {
                format: groupByMonth ? '%m-%Y' : '%d-%m-%Y',
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

    return {
      success: true,
      message: 'Profit & Loss Analytics',
      data: dbData,
    };
  }
}
