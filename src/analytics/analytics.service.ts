import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

type CountMap = Record<string, number>;

type ProductStockAnalytics = {
  productId: Types.ObjectId;
  totalStock: number;
  productName: string;
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
}
