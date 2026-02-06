import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { Quantity } from './entities/quantity.entity';
import { AddProductQuantityDto } from './dto/add-quantity.dto';
import { UpdateQuantityDto } from './dto/update-quantity.dto';
import { GetSpecificQuantityDto } from './dto/product-specific-quantity.dto';
import { ProductsHavingQuantityDto } from './dto/product-having-quantity.dto';
import { BadRequestException } from '@nestjs/common';
import { SORT_CATEGORY } from 'src/products/constants/product.constant';

export interface TotalQuantityResult {
  _id: string;
  totalQuantity: number;
}
interface CountResult {
  count: number;
}

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
      throw new NotFoundException('Could Not find Record');
    }

    return res;
  }

  async updateLimit(id: string, dto: UpdateQuantityDto): Promise<Quantity> {
    const { limit } = dto || {};

    if (limit === undefined) {
      throw new BadRequestException('Limit is required in the request body');
    }

    const result = await this.quantityModel
      .findByIdAndUpdate(id, { limit }, { new: true })
      .populate('warehouseId productId')
      .exec();

    if (!result) {
      throw new NotFoundException('Quantity record not found');
    }

    return result;
  }

  async getTotalQuantity(productId: string): Promise<TotalQuantityResult[]> {
    const res: TotalQuantityResult[] = await this.quantityModel.aggregate([
      {
        $match: {
          productId: new Types.ObjectId(productId),
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
      {
        $group: {
          _id: '$productId',
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]);

    if (!res) {
      throw new NotFoundException('Data Not Found');
    }

    return res;
  }

  async getSpecificWarehouseQuantity(
    query: GetSpecificQuantityDto,
  ): Promise<Quantity[]> {
    const { productId, warehouseId } = query;

    const ptId = new Types.ObjectId(productId);
    const wId = new Types.ObjectId(warehouseId);

    const res = await this.quantityModel
      .find({
        productId: ptId,
        warehouseId: wId,
      })
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

    if (warehouseId) {
      pipeline.push({
        $match: { warehouseId: new Types.ObjectId(warehouseId) },
      });
    }

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

    if (search) {
      pipeline.push({
        $match: { 'product.name': { $regex: search, $options: 'i' } },
      });
    }
    if (category) {
      pipeline.push({ $match: { 'product.category': category } });
    }

    pipeline.push({
      $group: {
        _id: '$productId',
        product: { $first: '$product' },
        totalQuantity: { $sum: '$quantity' },
      },
    });

    const sortConfig: Record<string, 1 | -1> = {};
    switch (sort) {
      case SORT_CATEGORY.NAME_ASC:
        sortConfig['product.name'] = 1;
        break;
      case SORT_CATEGORY.NAME_DESC:
        sortConfig['product.name'] = -1;
        break;
      case SORT_CATEGORY.CATEGORY_ASC:
        sortConfig['product.category'] = 1;
        break;
      case SORT_CATEGORY.CATEGORY_DESC:
        sortConfig['totalQuantity'] = 1;
        break;
      case SORT_CATEGORY.QUANTITY_DESC:
        sortConfig['totalQuantity'] = -1;
        break;
      default:
        sortConfig['product.createdAt'] = -1;
    }
    pipeline.push({ $sort: sortConfig });

    const skip = (page - 1) * limit;

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
    const totalPages = Math.ceil(totalCount / limit);

    return {
      products,
      totalCount,
      totalPages: totalPages,
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

    return await this.quantityModel
      .aggregate<WarehouseProductResult>(pipeline)
      .exec();
  }

  async findByProduct(productId: string) {
    return await this.quantityModel
      .find({ productId })
      .populate({
        path: 'productId',
        match: { isArchived: false },
      })
      .populate('warehouseId')
      .exec();
  }
}
