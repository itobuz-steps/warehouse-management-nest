// analytics.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Warehouse } from 'src/warehouse/schemas/warehouse.schema';
import { Product } from 'src/products/entities/product.entity';
import { TwoProductQuery } from './dto/tow-product-query.dto';
import { ExcelService } from 'src/helper/excelGenerator';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel('Warehouse') private warehouseModel: Model<Warehouse>,
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('Quantity') private quantityModel: Model<Quantity>,
    private readonly excelService: ExcelService,
  ) {}

  async getTwoProductQuantities(query: TwoProductQuery) {
    const { warehouseId, productA, productB } = query;

    const warehouse = await this.warehouseModel.findById(warehouseId);
    if (!warehouse) throw new NotFoundException('Warehouse not found.');

    const [productAData, productBData] = await Promise.all([
      this.productModel.findById(productA).lean(),
      this.productModel.findById(productB).lean(),
    ]);

    if (!productAData || !productBData) {
      throw new NotFoundException('One or both product(s) not found.');
    }

    const [qtyA, qtyB] = await Promise.all([
      this.quantityModel.findOne({ warehouseId, productA }).lean(),
      this.quantityModel.findOne({ warehouseId, productB }).lean(),
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

  async getTwoProductComparisonHistory(query: TwoProductQuery) {
    // Destructuring with renaming to match your DTO keys
    const { warehouseId, productA, productB } = query;

    // 1. Validate existence in parallel
    const [warehouse, productAData, productBData] = await Promise.all([
      this.warehouseModel.findById(warehouseId).lean(),
      this.productModel.findById(productA).lean(),
      this.productModel.findById(productB).lean(),
    ]);

    if (!warehouse) throw new NotFoundException('Warehouse not found.');
    if (!productAData || !productBData) {
      throw new NotFoundException('One or both product(s) not found.');
    }

    // 2. Set up date range (Last 7 days)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    // 3. Fetch transactions
    const transactions = await this.transactionModel
      .find({
        product: { $in: [productA, productB] },
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [
          { sourceWarehouse: warehouseId },
          { destinationWarehouse: warehouseId },
        ],
      })
      .lean();

    // 4. Initialize counts and date list
    const counts = { productA: {}, productB: {} };
    const dateList: string[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateKey = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      dateList.push(dateKey);
      counts.productA[dateKey] = 0;
      counts.productB[dateKey] = 0;
    }

    // 5. Aggregate transaction counts
    for (const transaction of transactions) {
      const dateKey = new Date(transaction.createdAt).toLocaleDateString(
        'en-CA',
      );
      if (String(transaction.product) === String(productA))
        counts.productA[dateKey]++;
      if (String(transaction.product) === String(productB))
        counts.productB[dateKey]++;
    }

    // 6. Format Result
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

  async getTwoProductQuantitiesData(query: TwoProductQuery) {
    const { warehouseId, productA, productB } = query;

    const [warehouse, productAData, productBData] = await Promise.all([
      this.warehouseModel.findById(warehouseId).lean(),
      this.productModel.findById(productA).lean(),
      this.productModel.findById(productB).lean(),
    ]);

    if (!warehouse) throw new NotFoundException('Warehouse not found.');
    if (!productAData || !productBData)
      throw new NotFoundException('Products not found.');

    const [qtyA, qtyB] = await Promise.all([
      this.quantityModel.findOne({ warehouseId, productA }).lean(),
      this.quantityModel.findOne({ warehouseId, productB }).lean(),
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
      this.warehouseModel.findById(warehouseId).lean(),
      this.productModel.findById(productA).lean(),
      this.productModel.findById(productB).lean(),
    ]);

    if (!warehouse) throw new NotFoundException('Warehouse not found.');
    if (!productAData || !productBData)
      throw new NotFoundException('Products not found.');

    // 1. Setup Date Range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    // 2. Fetch Transactions
    const transactions = await this.transactionModel
      .find({
        product: { $in: [productA, productB] },
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [
          { sourceWarehouse: warehouseId },
          { destinationWarehouse: warehouseId },
        ],
      })
      .lean();

    // 3. Initialize counts and date list
    const counts = {
      productA: {} as Record<string, number>,
      productB: {} as Record<string, number>,
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

    // 4. Aggregate Transaction Counts
    for (const transaction of transactions) {
      const dateKey = new Date(transaction.createdAt).toLocaleDateString(
        'en-CA',
      );
      if (String(transaction.product) === String(productA))
        counts.productA[dateKey]++;
      if (String(transaction.product) === String(productB))
        counts.productB[dateKey]++;
    }

    // 5. Construct Final Result
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
    return this.excelService.generateComparisonHistoryExcel(data);
  }
}
