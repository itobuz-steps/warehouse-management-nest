// src/dashboard/dashboard.service.ts
import { Injectable, HttpException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class DashboardService {
  constructor(
    private excel: ExcelService,

    @InjectModel(Quantity.name)
    private readonly quantityModel: Model<Quantity>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,

    @InjectModel(VariantStock.name)
    private readonly variantStockModel: Model<VariantStock>,
  ) {}

  validateWarehouse(id?: string) {
    if (!id) throw new HttpException('Warehouse Id missing', 404);
    return new mongoose.Types.ObjectId(id);
  }

  // ----------------------------------------------

  async getTopFiveProductsData(id: string) {
    const warehouseId = this.validateWarehouse(id);

    const data: TopProductItem[] = await this.quantityModel.aggregate([
      { $match: { warehouseId } },
      { $group: { _id: '$productId', totalQuantity: { $sum: '$quantity' } } },
      { $sort: { totalQuantity: -1 } },

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
          productId: { $toString: '$_id' },
          productName: '$product.name',
          category: '$product.category',
          price: '$product.price',
          totalQuantity: 1,
        },
      },

      { $limit: defaultDataLimit },
    ]);

    return data;
  }

  async getTopFiveProducts(id: string) {
    const data = await this.getTopFiveProductsData(id);
    return data;
  }

  async generateTopFiveProductsExcel(id: string) {
    const data = await this.getTopFiveProductsData(id);
    return this.excel.generateTopFiveProductsExcel(data);
  }

  // ----------------------------------------------

  async getInventoryByCategoryData(
    id: string,
  ): Promise<InventoryByCategoryAggItem[]> {
    const warehouseId = this.validateWarehouse(id);

    const productsCategory =
      await this.quantityModel.aggregate<InventoryByCategoryAggItem>([
        {
          $match: { warehouseId },
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
            _id: '$product.category',
            totalProducts: { $sum: '$quantity' },
            products: { $push: '$product' },
          },
        },
      ]);

    return productsCategory;
  }

  async generateInventoryByCategoryExcel(id: string) {
    const data = await this.getInventoryByCategoryData(id);
    return this.excel.generateInventoryByCategoryExcel(data);
  }

  async getInventoryByCategory(id: string) {
    const productsCategory = await this.getInventoryByCategoryData(id);

    return {
      message: 'Data fetched successfully',
      success: true,
      data: productsCategory,
    };
  }

  // ----------------------------------------------

  async getProductTransactionData(
    id: string,
  ): Promise<ProductTransactionDay[]> {
    const warehouseId = this.validateWarehouse(id);

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
            $or: [
              { type: TRANSACTION_TYPES.IN, destinationWarehouse: warehouseId },
              { type: TRANSACTION_TYPES.OUT, sourceWarehouse: warehouseId },
            ],
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

  async getProductTransaction(id: string) {
    const transactionDetails = await this.getProductTransactionData(id);

    return {
      message: 'Data fetched successfully',
      success: true,
      data: transactionDetails,
    };
  }

  // ---------------------------------------------------

  async getTransactionStats(id: string) {
    const warehouseId = new Types.ObjectId(this.validateWarehouse(id));

    // Sales Overview
    const sales = await this.transactionModel.aggregate<SalesOverview>([
      {
        $match: {
          type: TRANSACTION_TYPES.OUT,
          sourceWarehouse: warehouseId,
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
          destinationWarehouse: warehouseId,
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
    const inventory = await this.quantityModel.aggregate<InventoryOverview>([
      { $match: { warehouseId } },
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
          totalQuantity: { $sum: '$quantity' },
        },
      },
      {
        $project: {
          _id: 0,
          totalQuantity: 1,
        },
      },
    ]);

    // Today's Shipment Count
    const dayStarting = new Date();
    dayStarting.setHours(0, 0, 0, 0);

    const todayShipment =
      await this.transactionModel.aggregate<TodayShipmentOverview>([
        {
          $match: {
            sourceWarehouse: warehouseId,
            type: TRANSACTION_TYPES.OUT,
            createdAt: { $gte: dayStarting },
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

  async getLowStockProducts(id: string) {
    const stockLimit = Number(config().STOCK_LIMIT);
    console.log(stockLimit);

    const warehouseId = this.validateWarehouse(id);

    const lowStockProducts =
      await this.variantStockModel.aggregate<LowStockProduct>([
        {
          $match: {
            warehouseId: warehouseId,
          },
        },

        //add all quantity per variant
        {
          $group: {
            _id: '$productId',
            totalQuantity: { $sum: '$quantity' },
          },
        },

        // need to be taken from env kept for testing
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

  async getTopSellingProducts(id: string, limit = defaultDataLimit) {
    const warehouseId = this.validateWarehouse(id);

    const topSellingProducts =
      await this.transactionModel.aggregate<TopSellingProduct>([
        {
          $match: {
            type: TRANSACTION_TYPES.OUT,
            sourceWarehouse: warehouseId,
          },
        },

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
    id: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    },
  ) {
    const { startDate, endDate } = options || {};

    const warehouseId = this.validateWarehouse(id);
    const limit = Number(options?.limit || defaultDataLimit);

    const match: QueryFilter<Transaction> = {
      shipment: SHIPMENT_TYPES.CANCELLED,
      sourceWarehouse: warehouseId,
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
    id: string,
    options?: {
      limit?: number;
    },
  ) {
    const warehouseId = this.validateWarehouse(id);
    const limit = Number(options?.limit || defaultDataLimit);

    const mostAdjustedProducts = await this.transactionModel.aggregate([
      {
        $match: {
          type: TRANSACTION_TYPES.ADJUSTMENT,
          destinationWarehouse: warehouseId,
        },
      },

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
    const warehouseId = this.validateWarehouse(query.id);

    const period = query.period ?? TIME_RANGE.WEEK;
    const from = query.from;
    const to = query.to;

    let start: Date;
    let end: Date;
    let totalDays: number;

    const now = new Date();

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
        ![TIME_RANGE.WEEK as string, TIME_RANGE.MONTH as string].includes(
          period,
        )
      ) {
        throw new BadRequestException(
          'Invalid period. Allowed values: week, month',
        );
      }

      totalDays = period === (TIME_RANGE.MONTH as string) ? 30 : 7;

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

    // const dbData = await this.transactionModel.aggregate<ProfitLossItem>([
    //   { $match: match },

    //   {
    //     $lookup: {
    //       from: 'products',
    //       localField: 'product',
    //       foreignField: '_id',
    //       as: 'product',
    //     },
    //   },

    //   { $unwind: '$product' },

    //   {
    //     $addFields: {
    //       profitAmount: {
    //         $cond: [
    //           {
    //             $in: [
    //               '$type',
    //               [TRANSACTION_TYPES.OUT, TRANSACTION_TYPES.TRANSFER],
    //             ],
    //           },
    //           {
    //             $multiply: [
    //               '$quantity',
    //               {
    //                 $multiply: [
    //                   '$product.price',
    //                   { $add: [1, { $divide: ['$product.markup', 100] }] },
    //                 ],
    //               },
    //             ],
    //           },
    //           0,
    //         ],
    //       },

    //       lossAmount: {
    //         $cond: [
    //           { $in: ['$type', [TRANSACTION_TYPES.ADJUSTMENT]] },
    //           { $multiply: ['$quantity', '$product.price'] },
    //           0,
    //         ],
    //       },
    //     },
    //   },

    //   {
    //     $group: {
    //       _id: {
    //         $dateToString: {
    //           format: '%d-%m-%Y',
    //           date: '$createdAt',
    //           timezone: TIME_ZONE,
    //         },
    //       },
    //       profit: { $sum: '$profitAmount' },
    //       loss: { $sum: '$lossAmount' },
    //     },
    //   },

    //   {
    //     $project: {
    //       _id: 0,
    //       label: '$_id',
    //       profit: { $round: ['$profit', 2] },
    //       loss: { $round: ['$loss', 2] },
    //       net: { $round: [{ $subtract: ['$profit', '$loss'] }, 2] },
    //     },
    //   },
    // ]);

    // 🗺️ Create typed map
    const dbData = await this.transactionModel.aggregate<ProfitLossItem>([
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
        $lookup: {
          from: 'variants',
          localField: 'products.variants.variant',
          foreignField: '_id',
          as: 'variant',
        },
      },
      { $unwind: '$variant' },

      {
        $addFields: {
          costAmount: {
            $multiply: ['$products.variants.quantity', '$variant.price'],
          },
        },
      },

      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%d-%m-%Y',
                date: '$createdAt',
                timezone: TIME_ZONE,
              },
            },
            transactionId: '$_id',
          },
          totalCost: { $sum: '$costAmount' },
          totalRevenue: { $first: '$totalAmount' },
        },
      },

      {
        $group: {
          _id: '$_id.date',
          profit: {
            $sum: {
              $max: [{ $subtract: ['$totalRevenue', '$totalCost'] }, 0],
            },
          },
          loss: {
            $sum: {
              $max: [{ $subtract: ['$totalCost', '$totalRevenue'] }, 0],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          label: '$_id',
          profit: { $round: ['$profit', 2] },
          loss: { $round: ['$loss', 2] },
          net: { $round: [{ $subtract: ['$profit', '$loss'] }, 2] },
        },
      },
    ]);

    const map = dbData.reduce<Record<string, ProfitLossItem>>((acc, item) => {
      acc[item.label] = item;
      return acc;
    }, {});

    // 📅 Fill missing dates
    const final: ProfitLossItem[] = [];

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      const label = this.formatDateLocal(date);

      final.push(
        map[label] ?? {
          label,
          profit: 0,
          loss: 0,
          net: 0,
        },
      );
    }

    return {
      success: true,
      message: 'Profit & Loss Analytics',
      data: final,
    };
  }

  formatDateLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
}
