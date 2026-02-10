// src/dashboard/dashboard.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { Quantity } from 'src/quantity/entities/quantity.entity.js';

import { subDays, eachDayOfInterval, format } from 'date-fns';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from 'src/products/entities/product.entity';

export interface InventoryByCategoryAggItem {
  _id: string;
  totalProducts: number;
  products: any[];
}

export interface ProductTransactionDay {
  _id: string;
  IN: number;
  OUT: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private excel: GenerateExcelService,

    @InjectModel(Quantity.name)
    private readonly quantityModel: Model<Quantity>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  validateWarehouse(id?: string) {
    if (!id) throw new HttpException('Warehouse Id missing', 404);
    return new mongoose.Types.ObjectId(id);
  }

  // ----------------------------------------------

  async getTopFiveProductsData(id: string) {
    const warehouseId = this.validateWarehouse(id);

    const data: Quantity[] = await this.quantityModel.aggregate([
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

      { $limit: 5 },
    ]);

    console.log(data);
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

    const daysTransaction = await Transaction.aggregate<ProductTransactionDay>([
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

  async getProductTransactionExcel(id: string) {
    const transactionDetails = await this.getProductTransactionData(id);
    return this.excel.getProductTransactionExcel(transactionDetails);
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
    const warehouseId = this.validateWarehouse(id);

    const [sales] = await Transaction.aggregate([
      { $match: { type: TRANSACTION_TYPES.OUT, sourceWarehouse: warehouseId } },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },

      {
        $group: {
          _id: null,
          totalSales: { $sum: { $multiply: ['$quantity', '$product.price'] } },
          saleQuantity: { $sum: '$quantity' },
        },
      },
      { $project: { _id: 0, totalSales: 1, saleQuantity: 1 } },
    ]);

    return { success: true, data: sales ?? { totalSales: 0, saleQuantity: 0 } };
  }

  async getLowStockProducts(id: string) {
    const warehouseId = this.validateWarehouse(id);

    const data = await this.quantityModel.aggregate([
      { $match: { warehouseId } },
      { $match: { $expr: { $lte: ['$quantity', '$limit'] } } },

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
        $project: {
          _id: 0,
          productId: '$product._id',
          productName: '$product.name',
          quantity: 1,
        },
      },
    ]);

    return { success: true, data };
  }

  async getTopSellingProducts(id: string, limit = 5) {
    const warehouseId = this.validateWarehouse(id);

    const data = await Transaction.aggregate([
      { $match: { type: TRANSACTION_TYPES.OUT, sourceWarehouse: warehouseId } },

      {
        $lookup: {
          from: 'products',
          localField: 'product',
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
          price: { $first: '$product.price' },
          totalSoldQuantity: { $sum: '$quantity' },
          totalSalesAmount: {
            $sum: { $multiply: ['$quantity', '$product.price'] },
          },
          productImage: { $first: '$product.productImage' },
        },
      },

      { $sort: { totalSoldQuantity: -1 } },
      { $limit: Number(limit) },

      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: 1,
          category: 1,
          price: 1,
          totalSoldQuantity: 1,
          totalSalesAmount: 1,
          productImage: 1,
        },
      },
    ]);

    return { success: true, data };
  }

  async getMostCancelledProducts(id: string, query: any) {
    const warehouseId = this.validateWarehouse(id);
    const limit = Number(query.limit || 5);

    const match: any = {
      shipment: SHIPMENT_TYPES.CANCELLED,
      sourceWarehouse: warehouseId,
    };

    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) match.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) {
        const d = new Date(query.endDate);
        d.setHours(23, 59, 59, 999);
        match.createdAt.$lte = d;
      }
    }

    const data = await Transaction.aggregate([
      { $match: match },

      {
        $lookup: {
          from: 'products',
          localField: 'product',
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
          totalCancelledQuantity: { $sum: '$quantity' },
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

    return { success: true, data };
  }

  async getMostAdjustedProducts(id: string, limit = 5) {
    const warehouseId = this.validateWarehouse(id);

    const data = await Transaction.aggregate([
      {
        $match: {
          type: TRANSACTION_TYPES.ADJUSTMENT,
          destinationWarehouse: warehouseId,
        },
      },

      {
        $lookup: {
          from: 'products',
          localField: 'product',
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
          totalAdjustedQuantity: { $sum: '$quantity' },
          reason: { $first: '$reason' },
        },
      },

      { $sort: { totalAdjustedQuantity: -1 } },
      { $limit: Number(limit) },

      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: 1,
          category: 1,
          totalAdjustedQuantity: 1,
          reason: 1,
        },
      },
    ]);

    return { success: true, data };
  }

  async getProfitLoss(query: any) {
    const period = query.period || 'week';
    const warehouseId = query.warehouseId;
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

      totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    } else {
      totalDays = period === 'month' ? 30 : 7;
      start = new Date();
      start.setDate(start.getDate() - (totalDays - 1));
      start.setHours(0, 0, 0, 0);
      end = now;
    }

    const match: any = { createdAt: { $gte: start, $lte: end } };

    if (warehouseId) {
      match.$or = [
        { sourceWarehouse: new mongoose.Types.ObjectId(warehouseId) },
        { destinationWarehouse: new mongoose.Types.ObjectId(warehouseId) },
      ];
    }

    const dbData = await Transaction.aggregate([
      { $match: match },

      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },

      { $unwind: '$product' },

      {
        $addFields: {
          profitAmount: {
            $cond: [
              {
                $in: [
                  '$type',
                  [TRANSACTION_TYPES.OUT, TRANSACTION_TYPES.TRANSFER],
                ],
              },
              {
                $multiply: [
                  '$quantity',
                  {
                    $multiply: [
                      '$product.price',
                      { $add: [1, { $divide: ['$product.markup', 100] }] },
                    ],
                  },
                ],
              },
              0,
            ],
          },

          lossAmount: {
            $cond: [
              { $in: ['$type', [TRANSACTION_TYPES.ADJUSTMENT]] },
              { $multiply: ['$quantity', '$product.price'] },
              0,
            ],
          },
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'Asia/Kolkata',
            },
          },
          profit: { $sum: '$profitAmount' },
          loss: { $sum: '$lossAmount' },
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

    const map = {};
    dbData.forEach((d) => (map[d.label] = d));

    const final = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);

      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      final.push(map[label] || { label, profit: 0, loss: 0, net: 0 });
    }

    return { success: true, data: final };
  }
}
