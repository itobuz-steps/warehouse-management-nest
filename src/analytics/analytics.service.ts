import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { PipelineStage } from 'mongoose';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';
import { Product } from 'src/products/entities/product.entity';
import { TwoProductQuery } from './dto/tow-product-query.dto';
import { Quantity } from 'src/quantity/entities/quantity.entity';
import { Transaction } from 'src/transaction/schemas/transaction.schema';
import { ExcelService } from 'src/helper/excelGenerator';
import {
  VariantStock,
  VariantStockDocument,
} from 'src/variant-stock/schemas/variant-stock.schema';
import { Batch, BatchDocument } from 'src/batch/schemas/batch.schema';
import { DamagedBatchBySupplierQueryDto } from './dto/damaged-batch-by-supplier.dto';

type CountMap = Record<string, number>;

type ProductStockAnalytics = {
  productId: Types.ObjectId;
  totalStock: number;
  productName: string;
};

type SupplierDamageMatch = Record<string, unknown>;

type TransactionSummaryQuery = {
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
};

type TransactionSummary = {
  scope: {
    startDate: string | null;
    endDate: string | null;
    warehouseId: string | null;
  };
  overview: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalDamageLoss: number;
    inventoryValue: number;
  };
  salesTrend: Array<{
    date: string;
    revenue: number;
    procurement: number;
    net: number;
    orders: number;
  }>;
  transactionMix: Array<{
    type: string;
    count: number;
    totalAmount: number;
    percentage: number;
  }>;
  topProducts: Array<{
    productId: Types.ObjectId;
    productName: string;
    unitsSold: number;
  }>;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly excelService: ExcelService,

    @InjectModel('Warehouse') private warehouseModel: Model<Warehouse>,
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('Quantity') private quantityModel: Model<Quantity>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @InjectModel(VariantStock.name)
    private variantStockModel: Model<VariantStockDocument>,
    @InjectModel(Batch.name)
    private batchModel: Model<BatchDocument>,
  ) {}

  async getTwoProductQuantities(query: TwoProductQuery) {
    const { warehouseId, productA, productB } = query;

    const warehouse = await this.warehouseModel.findById(warehouseId);

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }

    const [productAData, productBData] = await Promise.all([
      this.productModel.findById(productA),
      this.productModel.findById(productB),
    ]);

    if (!productAData || !productBData) {
      throw new NotFoundException('One or both product(s) not found.');
    }

    const [qtyA, qtyB] = await Promise.all([
      this.quantityModel.findOne({ warehouseId, productA }),
      this.quantityModel.findOne({ warehouseId, productB }),
    ]);

    return {
      warehouse: warehouse.name,
      productA: {
        id: productA,
        name: productAData.name,
        quantity: qtyA?.quantity ?? 0,
      },
      productB: {
        id: productB,
        name: productBData.name,
        quantity: qtyB?.quantity ?? 0,
      },
    };
  }

  //this one
  async getTwoProductComparisonHistory(query: TwoProductQuery) {
    const { warehouseId, productA, productB } = query;

    const [warehouse, productAData, productBData] = await Promise.all([
      this.warehouseModel.findById(warehouseId),
      this.productModel.findById(productA),
      this.productModel.findById(productB),
    ]);

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }
    if (!productAData || !productBData) {
      throw new NotFoundException('One or both product(s) not found.');
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await this.transactionModel.find({
      product: { $in: [productA, productB] },
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [
        { sourceWarehouse: warehouseId },
        { destinationWarehouse: warehouseId },
      ],
    });

    const counts = {
      productA: {} as CountMap,
      productB: {} as CountMap,
    };
    const dateList: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateKey = d.toLocaleDateString('en-CA');
      dateList.push(dateKey);
      counts.productA[dateKey] = 0;
      counts.productB[dateKey] = 0;
    }

    for (const transaction of transactions) {
      const dateKey = new Date(transaction.createdAt).toLocaleDateString(
        'en-CA',
      );

      for (const product of transaction.products) {
        if (String(product.product) === String(productA)) {
          counts.productA[dateKey]++;
        }

        if (String(product.product) === String(productB)) {
          counts.productB[dateKey]++;
        }
      }
    }

    return {
      warehouse: warehouse.name,
      productA: {
        id: productA,
        name: productAData.name,
        history: dateList.map((date) => ({
          date,
          transactions: counts.productA[date],
        })),
      },
      productB: {
        id: productB,
        name: productBData.name,
        history: dateList.map((date) => ({
          date,
          transactions: counts.productB[date],
        })),
      },
    };
  }

  //and this one
  async getTwoProductQuantitiesData(query: TwoProductQuery) {
    const { warehouseId, productA, productB } = query;

    const [warehouse, productAData, productBData] = await Promise.all([
      this.warehouseModel.findById(warehouseId),
      this.productModel.findById(productA),
      this.productModel.findById(productB),
    ]);

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }
    if (!productAData || !productBData) {
      throw new NotFoundException('Products not found.');
    }

    const [qtyA, qtyB] = await Promise.all([
      this.quantityModel.findOne({
        warehouseId: new Types.ObjectId(warehouseId),
        productId: new Types.ObjectId(productA),
      }),
      this.quantityModel.findOne({
        warehouseId: new Types.ObjectId(warehouseId),
        productId: new Types.ObjectId(productB),
      }),
    ]);

    return {
      warehouse: warehouse.name,
      productA: {
        id: productA,
        name: productAData.name,
        quantity: qtyA?.quantity ?? 0,
      },
      productB: {
        id: productB,
        name: productBData.name,
        quantity: qtyB?.quantity ?? 0,
      },
    };
  }

  async getTwoProductComparisonHistoryData(query: TwoProductQuery) {
    const { warehouseId, productA, productB } = query;

    const [warehouse, productAData, productBData] = await Promise.all([
      this.warehouseModel.findById(warehouseId),
      this.productModel.findById(productA),
      this.productModel.findById(productB),
    ]);

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }
    if (!productAData || !productBData) {
      throw new NotFoundException('Products not found.');
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await this.transactionModel.find({
      product: { $in: [productA, productB] },
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [
        { sourceWarehouse: warehouseId },
        { destinationWarehouse: warehouseId },
      ],
    });

    const counts = {
      productA: {} as CountMap,
      productB: {} as CountMap,
    };
    const dateList: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateKey = d.toLocaleDateString('en-CA');
      dateList.push(dateKey);
      counts.productA[dateKey] = 0;
      counts.productB[dateKey] = 0;
    }

    for (const transaction of transactions) {
      const dateKey = new Date(transaction.createdAt).toLocaleDateString(
        'en-CA',
      );

      for (const product of transaction.products) {
        if (String(product.product) === String(productA)) {
          counts.productA[dateKey]++;
        }

        if (String(product.product) === String(productB)) {
          counts.productB[dateKey]++;
        }
      }
    }

    return {
      warehouse: warehouse.name,
      productA: {
        id: productA,
        name: productAData.name,
        history: dateList.map((date) => ({
          date,
          transactions: counts.productA[date],
        })),
      },
      productB: {
        id: productB,
        name: productBData.name,
        history: dateList.map((date) => ({
          date,
          transactions: counts.productB[date],
        })),
      },
    };
  }

  async getTwoProductQuantitiesExcel(query: TwoProductQuery): Promise<Buffer> {
    const data = await this.getTwoProductQuantitiesData(query);
    return this.excelService.generateTwoProductQuantityExcel(data);
  }

  async getTwoProductComparisonHistoryExcel(
    query: TwoProductQuery,
  ): Promise<Buffer> {
    const data = await this.getTwoProductComparisonHistoryData(query);
    return this.excelService.generateTwoProductTransactionExcel(data);
  }

  async getProductsByStock(
    order: 'asc' | 'desc',
    limit = 10,
    warehouseId?: string,
  ): Promise<ProductStockAnalytics[]> {
    const match: { warehouseId?: Types.ObjectId } = {};

    if (warehouseId) {
      match.warehouseId = new Types.ObjectId(warehouseId);
    }

    return this.variantStockModel.aggregate<ProductStockAnalytics>([
      { $match: match },
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' },
        },
      },
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
        $sort: { totalStock: order === 'asc' ? 1 : -1 },
      },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          totalStock: 1,
          productName: '$product.name',
        },
      },
    ]);
  }

  async getVariantsByStock(
    order: 'asc' | 'desc',
    limit = 10,
    warehouseId?: string,
  ) {
    const match: { warehouseId?: Types.ObjectId } = {};

    if (warehouseId) {
      match.warehouseId = new Types.ObjectId(warehouseId);
    }

    return this.variantStockModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$variantId',
          totalStock: { $sum: '$quantity' },
          productId: { $first: '$productId' },
        },
      },
      {
        $lookup: {
          from: 'variants',
          localField: '_id',
          foreignField: '_id',
          as: 'variant',
        },
      },
      { $unwind: '$variant' },
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
        $sort: { totalStock: order === 'asc' ? 1 : -1 },
      },
      { $limit: limit },
    ]);
  }

  async getWarehouseProductStock(warehouseId: string) {
    return this.variantStockModel.aggregate([
      {
        $match: {
          warehouseId: new Types.ObjectId(warehouseId),
        },
      },
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
    ]);
  }

  async getTopSellingProducts(
    order: 'asc' | 'desc' = 'desc',
    limit = 10,
    warehouseId?: string,
  ) {
    const match: Record<string, string | Types.ObjectId> = { type: 'OUT' };
    if (warehouseId) {
      match.sourceWarehouse = new Types.ObjectId(warehouseId);
    }

    return this.transactionModel.aggregate([
      { $match: match },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product',
          totalSold: {
            $sum: {
              $sum: '$products.variants.quantity',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $sort: { totalSold: order === 'asc' ? 1 : -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$product.name',
          totalSold: 1,
        },
      },
    ]);
  }

  async getTopSellingVariants(productId: string, warehouseId?: string) {
    const match: Record<string, string | Types.ObjectId> = { type: 'OUT' };
    if (warehouseId) {
      match.sourceWarehouse = new Types.ObjectId(warehouseId);
    }

    return this.transactionModel.aggregate([
      { $match: match },
      { $unwind: '$products' },
      {
        $match: {
          'products.product': new Types.ObjectId(productId),
        },
      },
      { $unwind: '$products.variants' },
      {
        $group: {
          _id: '$products.variants.variant',
          totalSold: { $sum: '$products.variants.quantity' },
        },
      },
      {
        $lookup: {
          from: 'variants',
          localField: '_id',
          foreignField: '_id',
          as: 'variant',
        },
      },
      { $unwind: '$variant' },
      { $sort: { totalSold: -1 } },
      {
        $project: {
          _id: 0,
          variantId: '$_id',
          variantName: '$variant.sku',
          totalSold: 1,
        },
      },
    ]);
  }

  async getTopStockProducts(
    order: 'asc' | 'desc' = 'desc',
    limit = 10,
    warehouseId?: string,
  ) {
    const match: Record<string, string | Types.ObjectId> = {};
    if (warehouseId) {
      match.warehouseId = new Types.ObjectId(warehouseId);
    }

    return this.variantStockModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$productId',
          totalStock: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $sort: { totalStock: order === 'asc' ? 1 : -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: '$product.name',
          totalStock: 1,
        },
      },
    ]);
  }

  async getTopStockVariants(productId: string, warehouseId?: string) {
    const match: Record<string, Types.ObjectId> = {
      productId: new Types.ObjectId(productId),
    };
    if (warehouseId) {
      match.warehouseId = new Types.ObjectId(warehouseId);
    }

    return this.variantStockModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$variantId',
          totalStock: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'variants',
          localField: '_id',
          foreignField: '_id',
          as: 'variant',
        },
      },
      { $unwind: '$variant' },
      { $sort: { totalStock: -1 } },
      {
        $project: {
          _id: 0,
          variantId: '$_id',
          variantName: '$variant.sku',
          totalStock: 1,
        },
      },
    ]);
  }

  async getTopBatchesByVolume(
    order: 'asc' | 'desc' = 'desc',
    limit = 10,
    warehouseId?: string,
  ) {
    const match: Record<string, Types.ObjectId> = {};
    if (warehouseId) {
      match.destinationWarehouse = new Types.ObjectId(warehouseId);
    }

    return this.batchModel.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$_id',
          totalQuantity: { $sum: '$items.quantity' },
          destinationWarehouse: { $first: '$destinationWarehouse' },
          createdAt: { $first: '$createdAt' },
          itemCount: { $sum: 1 },
        },
      },
      { $sort: { totalQuantity: order === 'asc' ? 1 : -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'destinationWarehouse',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      {
        $project: {
          _id: 0,
          batchId: '$_id',
          totalQuantity: 1,
          itemCount: 1,
          createdAt: 1,
          warehouseName: { $arrayElemAt: ['$warehouse.name', 0] },
        },
      },
    ]);
  }

  async getTopConsumedBatches(limit = 10, warehouseId?: string) {
    const match: Record<string, Types.ObjectId> = {};
    if (warehouseId) {
      match.destinationWarehouse = new Types.ObjectId(warehouseId);
    }

    return this.batchModel.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$_id',
          totalConsumed: {
            $sum: {
              $subtract: ['$items.quantity', '$items.remainingQuantity'],
            },
          },
          totalQuantity: { $sum: '$items.quantity' },
          createdAt: { $first: '$createdAt' },
          destinationWarehouse: { $first: '$destinationWarehouse' },
        },
      },
      { $sort: { totalConsumed: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'destinationWarehouse',
          foreignField: '_id',
          as: 'warehouse',
        },
      },
      {
        $project: {
          _id: 0,
          batchId: '$_id',
          totalConsumed: 1,
          totalQuantity: 1,
          createdAt: 1,
          warehouseName: { $arrayElemAt: ['$warehouse.name', 0] },
        },
      },
    ]);
  }

  async getDamagedCostBySupplier(query: DamagedBatchBySupplierQueryDto) {
    // Keep orchestration minimal: build filter + pipeline, then execute.
    const match = this.buildSupplierDamageMatch(query);
    const pipeline = this.buildSupplierDamagePipeline(match);

    return this.transactionModel.aggregate(pipeline);
  }

  async getTransactionSummary(
    query: TransactionSummaryQuery,
  ): Promise<TransactionSummary> {
    const [
      overviewRows,
      damageRows,
      inventoryRows,
      trendRows,
      mixRows,
      topRows,
    ] = await Promise.all([
      this.transactionModel.aggregate<{
        totalRevenue: number;
        totalOrders: number;
        outOrders: number;
      }>(this.buildTransactionOverviewPipeline(query)),
      this.transactionModel.aggregate<{ totalDamageLoss: number }>(
        this.buildTransactionDamageLossPipeline(query),
      ),
      this.variantStockModel.aggregate<{ inventoryValue: number }>(
        this.buildInventoryValuePipeline(query),
      ),
      this.transactionModel.aggregate<{
        date: string;
        revenue: number;
        procurement: number;
        orders: number;
      }>(this.buildSalesTrendPipeline(query)),
      this.transactionModel.aggregate<{
        type: string;
        count: number;
        totalAmount: number;
      }>(this.buildTransactionMixPipeline(query)),
      this.transactionModel.aggregate<{
        productId: Types.ObjectId;
        productName: string;
        unitsSold: number;
      }>(this.buildTopProductsPipeline(query)),
    ]);

    const totalRevenue = overviewRows[0]?.totalRevenue ?? 0;
    const totalOrders = overviewRows[0]?.totalOrders ?? 0;
    const outOrders = overviewRows[0]?.outOrders ?? 0;
    const totalDamageLoss = damageRows[0]?.totalDamageLoss ?? 0;
    const inventoryValue = inventoryRows[0]?.inventoryValue ?? 0;
    const averageOrderValue = outOrders > 0 ? totalRevenue / outOrders : 0;

    const totalMixCount = mixRows.reduce((sum, row) => sum + row.count, 0);
    const transactionMix = mixRows.map((row) => ({
      type: row.type,
      count: row.count,
      totalAmount: this.roundToTwo(row.totalAmount),
      percentage:
        totalMixCount > 0
          ? this.roundToTwo((row.count / totalMixCount) * 100)
          : 0,
    }));

    return {
      scope: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
        warehouseId: query.warehouseId ?? null,
      },
      overview: {
        totalRevenue: this.roundToTwo(totalRevenue),
        totalOrders,
        averageOrderValue: this.roundToTwo(averageOrderValue),
        totalDamageLoss: this.roundToTwo(totalDamageLoss),
        inventoryValue: this.roundToTwo(inventoryValue),
      },
      salesTrend: trendRows.map((row) => ({
        date: row.date,
        revenue: this.roundToTwo(row.revenue),
        procurement: this.roundToTwo(row.procurement),
        net: this.roundToTwo(row.revenue - row.procurement),
        orders: row.orders,
      })),
      transactionMix,
      topProducts: topRows,
    };
  }

  private buildTransactionBaseMatch(query: TransactionSummaryQuery) {
    const { warehouseId, startDate, endDate } = query;

    const match: Record<string, unknown> = {
      approvalStatus: 'APPROVED',
    };

    if (startDate || endDate) {
      match.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    if (warehouseId) {
      const warehouseObjectId = new Types.ObjectId(warehouseId);
      match.$or = [
        { sourceWarehouse: warehouseObjectId },
        { destinationWarehouse: warehouseObjectId },
      ];
    }

    return match;
  }

  private buildTransactionOverviewPipeline(
    query: TransactionSummaryQuery,
  ): PipelineStage[] {
    const match = this.buildTransactionBaseMatch(query);

    return [
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$type', 'OUT'] }, '$totalAmount', 0],
            },
          },
          totalOrders: { $sum: 1 },
          outOrders: {
            $sum: {
              $cond: [{ $eq: ['$type', 'OUT'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalOrders: 1,
          outOrders: 1,
        },
      },
    ];
  }

  private buildSalesTrendPipeline(
    query: TransactionSummaryQuery,
  ): PipelineStage[] {
    const match = this.buildTransactionBaseMatch(query);

    return [
      { $match: match },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
              },
            },
          },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$type', 'OUT'] }, '$totalAmount', 0],
            },
          },
          procurement: {
            $sum: {
              $cond: [{ $eq: ['$type', 'IN'] }, '$totalAmount', 0],
            },
          },
          orders: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          revenue: 1,
          procurement: 1,
          orders: 1,
        },
      },
      { $sort: { date: 1 } },
    ];
  }

  private buildTransactionMixPipeline(
    query: TransactionSummaryQuery,
  ): PipelineStage[] {
    const match = this.buildTransactionBaseMatch(query);

    return [
      { $match: match },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          count: 1,
          totalAmount: 1,
        },
      },
      { $sort: { count: -1 } },
    ];
  }

  private buildTopProductsPipeline(
    query: TransactionSummaryQuery,
  ): PipelineStage[] {
    const match = this.buildTransactionBaseMatch(query);

    return [
      {
        $match: {
          ...match,
          type: 'OUT',
        },
      },
      { $unwind: '$products' },
      { $unwind: '$products.variants' },
      {
        $group: {
          _id: '$products.product',
          unitsSold: { $sum: '$products.variants.quantity' },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: { $arrayElemAt: ['$product.name', 0] },
          unitsSold: 1,
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ];
  }

  private buildTransactionDamageLossPipeline(
    query: TransactionSummaryQuery,
  ): PipelineStage[] {
    const { warehouseId, startDate, endDate } = query;

    const match: Record<string, unknown> = {
      type: 'IN',
    };

    if (warehouseId) {
      match.destinationWarehouse = new Types.ObjectId(warehouseId);
    }

    if (startDate || endDate) {
      match.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    return [
      { $match: match },
      { $unwind: '$products' },
      { $unwind: '$products.variants' },
      { $unwind: '$products.variants.batches' },
      {
        $lookup: {
          from: 'batches',
          localField: 'products.variants.batches.batch',
          foreignField: '_id',
          as: 'batch',
        },
      },
      { $unwind: '$batch' },
      { $unwind: '$batch.items' },
      {
        $match: {
          $expr: {
            $eq: ['$batch.items.variant', '$products.variants.variant'],
          },
        },
      },
      {
        $lookup: {
          from: 'variants',
          localField: 'batch.items.variant',
          foreignField: '_id',
          as: 'variant',
        },
      },
      {
        $unwind: {
          path: '$variant',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          damagedQuantity: { $ifNull: ['$batch.items.damagedQuantity', 0] },
          variantPrice: { $ifNull: ['$variant.price', 0] },
        },
      },
      {
        $group: {
          _id: null,
          totalDamageLoss: {
            $sum: {
              $multiply: ['$damagedQuantity', '$variantPrice'],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalDamageLoss: 1,
        },
      },
    ];
  }

  private buildInventoryValuePipeline(
    query: TransactionSummaryQuery,
  ): PipelineStage[] {
    const match: Record<string, unknown> = {};

    if (query.warehouseId) {
      match.warehouseId = new Types.ObjectId(query.warehouseId);
    }

    return [
      { $match: match },
      {
        $lookup: {
          from: 'variants',
          localField: 'variantId',
          foreignField: '_id',
          as: 'variant',
        },
      },
      {
        $unwind: {
          path: '$variant',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          variantPrice: { $ifNull: ['$variant.price', 0] },
        },
      },
      {
        $group: {
          _id: null,
          inventoryValue: {
            $sum: {
              $multiply: ['$quantity', '$variantPrice'],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          inventoryValue: 1,
        },
      },
    ];
  }

  private roundToTwo(value: number): number {
    return Number(value.toFixed(2));
  }

  private buildSupplierDamageMatch(
    query: DamagedBatchBySupplierQueryDto,
  ): SupplierDamageMatch {
    // Scope to supplier-linked stock-in transactions; add optional filters.
    const { supplierId, warehouseId, startDate, endDate } = query;

    const match: SupplierDamageMatch = {
      type: 'IN',
      supplier: { $ne: null },
    };

    if (supplierId) {
      match.supplier = new Types.ObjectId(supplierId);
    }

    if (warehouseId) {
      match.destinationWarehouse = new Types.ObjectId(warehouseId);
    }

    if (startDate || endDate) {
      match.createdAt = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && {
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        }),
      };
    }

    return match;
  }

  private buildSupplierDamagePipeline(
    match: SupplierDamageMatch,
  ): PipelineStage[] {
    return [
      { $match: match },
      { $unwind: '$products' },
      { $unwind: '$products.variants' },
      { $unwind: '$products.variants.batches' },
      {
        // Join actual batch documents referenced from transaction variant entries.
        $lookup: {
          from: 'batches',
          localField: 'products.variants.batches.batch',
          foreignField: '_id',
          as: 'batch',
        },
      },
      { $unwind: '$batch' },
      { $unwind: '$batch.items' },
      {
        // Ensure we only price damage for the same variant in the batch item.
        $match: {
          $expr: {
            $eq: ['$batch.items.variant', '$products.variants.variant'],
          },
        },
      },
      {
        $lookup: {
          from: 'variants',
          localField: 'batch.items.variant',
          foreignField: '_id',
          as: 'variant',
        },
      },
      {
        $unwind: {
          path: '$variant',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          damagedQuantity: { $ifNull: ['$batch.items.damagedQuantity', 0] },
          variantPrice: { $ifNull: ['$variant.price', 0] },
        },
      },
      {
        $addFields: {
          damageValue: { $multiply: ['$damagedQuantity', '$variantPrice'] },
        },
      },
      {
        // Stage 1 rollup: compute damage per supplier+batch.
        $group: {
          _id: {
            supplierId: '$supplier',
            batchId: '$batch._id',
          },
          batchDamagedQuantity: { $sum: '$damagedQuantity' },
          batchDamageCost: { $sum: '$damageValue' },
          batchCreatedAt: { $first: '$batch.createdAt' },
          destinationWarehouse: { $first: '$batch.destinationWarehouse' },
        },
      },
      {
        $match: {
          batchDamagedQuantity: { $gt: 0 },
        },
      },
      {
        $sort: {
          '_id.supplierId': 1,
          batchDamageCost: -1,
          batchDamagedQuantity: -1,
        },
      },
      {
        // Stage 2 rollup: compute supplier totals and keep sorted batch rows.
        $group: {
          _id: {
            supplierId: '$_id.supplierId',
          },
          totalDamagedQuantity: { $sum: '$batchDamagedQuantity' },
          totalDamageCost: { $sum: '$batchDamageCost' },
          totalDamagedBatches: { $sum: 1 },
          topDamagedBatches: {
            $push: {
              batchId: '$_id.batchId',
              totalDamagedQuantity: '$batchDamagedQuantity',
              totalDamageCost: '$batchDamageCost',
              batchCreatedAt: '$batchCreatedAt',
              destinationWarehouse: '$destinationWarehouse',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id.supplierId',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      {
        $unwind: {
          path: '$supplier',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          totalDamageCost: -1,
          totalDamagedQuantity: -1,
        },
      },
      {
        // Final shape: supplier totals + top 5 most damaged batches.
        $project: {
          _id: 0,
          supplier: {
            supplierId: '$supplier._id',
            name: '$supplier.name',
            email: '$supplier.email',
          },
          damage: {
            totalDamagedQuantity: '$totalDamagedQuantity',
            totalDamageCost: '$totalDamageCost',
          },
          totalDamagedBatches: 1,
          topDamagedBatches: { $slice: ['$topDamagedBatches', 5] },
        },
      },
    ];
  }
}
