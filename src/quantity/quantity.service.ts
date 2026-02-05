// quantity.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { Quantity } from './entities/quantity.entity';
import { AddProductQuantityDto } from './dto/add-quantity.dto';
import { UpdateQuantityDto } from './dto/update-quantity.dto';
import { GetSpecificQuantityDto } from './dto/product-specific-quantity.dto';
import { ProductsHavingQuantityDto } from './dto/product-having-quantity.dto';

export interface TotalQuantityResult {
  _id: string;
  totalQuantity: number;
}
interface CountResult {
  count: number;
}

// interfaces/warehouse-products.interface.ts
export interface WarehouseProductResult {
  _id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  limit: number;
  product: {
    _id: string;
    name: string;
    category: string;
    isArchived: boolean;
    // ... add other product fields you need
  };
}
@Injectable()
export class QuantityService {
  constructor(
    @InjectModel(Quantity.name) private quantityModel: Model<Quantity>,
  ) {}

  async create(dto: AddProductQuantityDto): Promise<Quantity> {
    const created = await this.quantityModel.create(dto);

    const res = await this.quantityModel
      .findById(created._id)
      .populate('warehouseId productId')
      .exec();

    if (!res) {
      throw new NotFoundException('Could Not found Record');
    }

    return res;
  }

  async updateLimit(id: string, dto: UpdateQuantityDto): Promise<Quantity> {
    const result = await this.quantityModel
      .findByIdAndUpdate(id, { limit: dto.limit }, { new: true })
      .populate('warehouseId productId')
      .exec();

    if (!result) {
      throw new NotFoundException('Quantity record not found');
    }

    return result;
  }

  async getTotalQuantity(productId: string): Promise<TotalQuantityResult[]> {
    return await this.quantityModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
        },
      },
      {
        $lookup: {
          from: 'products', // Ensure this matches your actual MongoDB collection name
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isArchived': false } },
      {
        $group: {
          _id: productId,
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);
  }

  async getSpecificWarehouseQuantity(
    query: GetSpecificQuantityDto,
  ): Promise<Quantity[]> {
    const { productId, warehouseId } = query;

    const res = await this.quantityModel
      .find({ productId, warehouseId })
      .populate({
        path: 'productId',
        match: { isArchived: false },
      })
      .populate('warehouseId')
      .exec();

    if (!res) {
      throw new NotFoundException("Couldn't Find Record");
    }
    return res;
  }

  async getProductsHavingQuantity(query: ProductsHavingQuantityDto) {
    const { search, category, sort, warehouseId, page, limit } = query;
    const pipeline: PipelineStage[] = [];

    // 1. Initial Match (Warehouse)
    if (warehouseId) {
      pipeline.push({
        $match: { warehouseId: new Types.ObjectId(warehouseId) },
      });
    }

    // 2. Join Products and filter archived
    pipeline.push(
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
    );

    // 3. Search and Category Filters
    if (search) {
      pipeline.push({
        $match: { 'product.name': { $regex: search, $options: 'i' } },
      });
    }
    if (category) {
      pipeline.push({ $match: { 'product.category': category } });
    }

    // 4. Grouping
    pipeline.push({
      $group: {
        _id: '$productId',
        product: { $first: '$product' },
        totalQuantity: { $sum: '$quantity' },
      },
    });

    // 5. Sorting
    const sortConfig: Record<string, 1 | -1> = {};
    switch (sort) {
      case 'name_asc':
        sortConfig['product.name'] = 1;
        break;
      case 'name_desc':
        sortConfig['product.name'] = -1;
        break;
      case 'category_asc':
        sortConfig['product.category'] = 1;
        break;
      case 'quantity_asc':
        sortConfig['totalQuantity'] = 1;
        break;
      case 'quantity_desc':
        sortConfig['totalQuantity'] = -1;
        break;
      default:
        sortConfig['product.createdAt'] = -1;
    }
    pipeline.push({ $sort: sortConfig });

    // 6. Pagination & Formatting
    const skip = (page - 1) * limit;

    // We clone the pipeline for the count before adding skip/limit
    const countPipeline = [...pipeline, { $count: 'count' }];

    pipeline.push(
      { $skip: skip },
      { $limit: limit },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$product', { totalQuantity: '$totalQuantity' }],
          },
        },
      },
    );

    const [products, countResult] = await Promise.all([
      this.quantityModel.aggregate(pipeline).exec(),
      this.quantityModel.aggregate<CountResult>(countPipeline).exec(),
    ]);

    const totalCount = countResult[0]?.count || 0;

    return {
      products,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      productsPerPage: limit,
    };
  }

  async getWarehouseProducts(
    warehouseId: string,
  ): Promise<WarehouseProductResult[]> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          warehouseId: new Types.ObjectId(warehouseId),
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
      { $match: { 'product.isArchived': false } },
    ];

    // Use the interface here to prevent "unsafe return" errors
    return await this.quantityModel
      .aggregate<WarehouseProductResult>(pipeline)
      .exec();
  }

  async getProductWarehouses(productId: string): Promise<Quantity[]> {
    const res = await this.quantityModel
      .find({ productId })
      .populate({
        path: 'productId',
        match: { isArchived: false },
      })
      .populate('warehouseId')
      .exec();

    if (!res) {
      throw new NotFoundException('Record Could Not Be Found');
    }
    return res;
  }
}
