import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, QueryFilter, Types } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-product-query.dto';
import { updateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { SORT_CATEGORY } from './constants/product.constant';
import * as QRCode from 'qrcode';
import { SortOrder } from 'mongoose';
import { VariantService } from 'src/variant/variant.service';
import { GetWarehouseProductsQueryDto } from './dto/get-warehouse-products-query';
import {
  VariantStock,
  VariantStockDocument,
} from 'src/variant-stock/schemas/variant-stock.schema';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,

    @InjectModel(VariantStock.name)
    private variantStockModel: Model<VariantStockDocument>,

    private readonly variantService: VariantService,
    private readonly logsService: TransactionLogsService,
  ) {}

  async getProducts(queryDto: GetProductsQueryDto) {
    const { search, category, sort, page = '1', limit = '10' } = queryDto;

    const baseFilter: QueryFilter<ProductDocument> = {
      isArchived: false,
    };

    const categories = Array.isArray(category)
      ? category
      : category
        ? [category]
        : [];

    if (categories.length) {
      baseFilter.category = { $in: categories };
    }

    const pageNumber = Math.max(parseInt(page, 10), 1);
    const limitNumber = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const pipeline: PipelineStage[] = [
      { $match: baseFilter },

      {
        $lookup: {
          from: 'variants',
          localField: '_id',
          foreignField: 'product',
          as: 'variants',
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
            { 'variants.sku': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({
      $addFields: {
        minPrice: { $min: '$variants.price' },
        minRetailPrice: {
          $min: {
            $map: {
              input: '$variants',
              as: 'v',
              in: {
                $multiply: [
                  '$$v.price',
                  { $add: [{ $divide: ['$$v.markup', 100] }, 1] },
                ],
              },
            },
          },
        },
      },
    });

    let sortStage: Record<string, 1 | -1> = { createdAt: -1 };

    switch (sort) {
      case SORT_CATEGORY.LATEST:
        sortStage = { createdAt: -1 };
        break;

      case SORT_CATEGORY.OLDEST:
        sortStage = { createdAt: 1 };
        break;

      case SORT_CATEGORY.COST_ASC:
        sortStage = { minPrice: 1 };
        break;

      case SORT_CATEGORY.COST_DESC:
        sortStage = { minPrice: -1 };
        break;

      case SORT_CATEGORY.RETAIL_ASC:
        sortStage = { minRetailPrice: 1 };
        break;

      case SORT_CATEGORY.RETAIL_DESC:
        sortStage = { minRetailPrice: -1 };
        break;

      case SORT_CATEGORY.NAME_ASC:
        sortStage = { name: 1 };
        break;

      case SORT_CATEGORY.NAME_DESC:
        sortStage = { name: -1 };
        break;

      case SORT_CATEGORY.CATEGORY_ASC:
        sortStage = { category: 1 };
        break;

      default:
        sortStage = { createdAt: -1 };
    }

    pipeline.push({ $sort: sortStage });

    pipeline.push(
      { $skip: skip },
      { $limit: limitNumber },
      {
        $project: {
          variants: 0,
          minPrice: 0,
          minRetailPrice: 0,
        },
      },
    );

    const countPipeline: PipelineStage[] = [
      { $match: baseFilter },
      {
        $lookup: {
          from: 'variants',
          localField: '_id',
          foreignField: 'product',
          as: 'variants',
        },
      },
    ];

    if (search) {
      countPipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { 'variants.sku': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    countPipeline.push({ $count: 'total' });

    const [products, countResult] = await Promise.all([
      this.productModel.aggregate<ProductDocument>(pipeline),
      this.productModel.aggregate<{ total: number }>(countPipeline),
    ]);

    const totalCount = countResult[0]?.total ?? 0;
    const totalPages = Math.ceil(totalCount / limitNumber);

    return {
      products,
      totalCount,
      totalPages,
      currentPage: pageNumber,
      productsPerPage: limitNumber,
    };
  }

  async getProductsForWarehouse(query: GetWarehouseProductsQueryDto) {
    const filter: QueryFilter<ProductDocument> = { isArchived: false };

    if (query.warehouseId) {
      const productStocks = await this.variantStockModel
        .find({
          warehouseId: new Types.ObjectId(query.warehouseId),
        })
        .distinct('productId');
      filter._id = { $in: productStocks };
    }

    if (query.category) {
      filter.category = query.category;
    }

    return this.productModel.find(filter);
  }

  async update(
    id: string,
    updateProductDto: updateProductDto,
    user: UserDocument,
  ) {
    const productId = new Types.ObjectId(id);

    const existingProduct = await this.productModel.findById(productId);

    if (!existingProduct) {
      throw new NotFoundException('Product not found');
    }

    const oldValue = {
      description: existingProduct.description,
    };

    const updatedProduct = await this.productModel.findByIdAndUpdate(
      productId,
      updateProductDto,
      { new: true, runValidators: true },
    );

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    const newValue = {
      description: updatedProduct.description,
    };

    await this.logsService.createLog({
      action: LOG_ACTION.PRODUCT_UPDATED,
      entityType: LOG_ENTITY_TYPE.PRODUCT,
      entityId: updatedProduct._id.toHexString(),
      performedBy: user,
      metadata: {
        oldValue,
        newValue,
      },
    });

    return updatedProduct;
  }

  async create(
    userId: Types.ObjectId,
    createProductDto: CreateProductDto,
    user: UserDocument,
    imageUrls: string[],
  ) {
    const session = await this.productModel.db.startSession();
    session.startTransaction();

    try {
      const normalizedName = createProductDto.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      const label = await this.generateUniqueLabel(normalizedName);

      const product = await new this.productModel({
        name: createProductDto.name,
        category: createProductDto.category,
        description: createProductDto.description,
        isArchived: createProductDto.isArchived,
        createdBy: userId,
        brand: createProductDto.brand,
        label: createProductDto.label ? createProductDto.label : label,
        variantCount: 0,
      }).save({ session });

      await this.logsService.createLog({
        action: LOG_ACTION.PRODUCT_CREATED,
        entityType: LOG_ENTITY_TYPE.PRODUCT,
        entityId: product._id.toHexString(),
        performedBy: user,
        metadata: {
          name: product.name,
          category: product.category,
          brand: product.brand,
          label: product.label,
          description: product.description,
          isArchived: product.isArchived,
        },
      });

      const attributes = createProductDto.variantAttributes;

      await this.variantService.createInternal(
        product._id.toString(),
        attributes,
        createProductDto.price,
        createProductDto.markup,
        imageUrls,
        user,
        session,
      );

      await session.commitTransaction();
      await session.endSession();

      return product;
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  }

  async remove(id: string, user: UserDocument) {
    const archivedProduct = await this.productModel.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true },
    );

    if (!archivedProduct) {
      throw new NotFoundException('Product not found');
    }

    await this.logsService.createLog({
      action: LOG_ACTION.PRODUCT_ARCHIVED,
      entityType: LOG_ENTITY_TYPE.PRODUCT,
      entityId: archivedProduct._id.toHexString(),
      performedBy: user,
      metadata: {
        name: archivedProduct.name,
        isArchived: archivedProduct.isArchived,
      },
    });

    return archivedProduct;
  }

  async restore(id: string, user: UserDocument) {
    const restoredProduct = await this.productModel.findByIdAndUpdate(
      id,
      { isArchived: false },
      { new: true },
    );

    if (!restoredProduct) {
      throw new NotFoundException('Product not found');
    }

    await this.logsService.createLog({
      action: LOG_ACTION.PRODUCT_RESTORED,
      entityType: LOG_ENTITY_TYPE.PRODUCT,
      entityId: restoredProduct._id.toHexString(),
      performedBy: user,
      metadata: {
        name: restoredProduct.name,
        isArchived: restoredProduct.isArchived,
      },
    });

    return restoredProduct;
  }

  async generateQrCode(url: string): Promise<Buffer> {
    return QRCode.toBuffer(url);
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findArchived(queryDto: GetProductsQueryDto) {
    const { search, category, sort, page = '1', limit = '10' } = queryDto;

    const pageNumber = Math.max(parseInt(page, 10), 1);
    const limitNumber = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const query = this.productModel.find().where('isArchived').equals(true);

    if (category) {
      query.where('category').equals(category);
    }

    if (search) {
      query.where('name').regex(new RegExp(search, 'i'));
    }

    const sortMap: Record<string, Record<string, SortOrder>> = {
      [SORT_CATEGORY.NAME_ASC]: { name: 1 },
      [SORT_CATEGORY.NAME_DESC]: { name: -1 },
      [SORT_CATEGORY.CATEGORY_ASC]: { category: 1 },
    };
    query.sort(sortMap[sort as string] || { createdAt: -1 });

    const [products, totalCount] = await Promise.all([
      query.clone().populate('createdBy').skip(skip).limit(limitNumber).exec(),
      this.productModel.countDocuments(query.getFilter()).exec(),
    ]);

    return {
      products,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNumber),
      currentPage: pageNumber,
      productsPerPage: limitNumber,
    };
  }

  private async generateUniqueLabel(base: string): Promise<string> {
    let length = 5;
    let label = base.slice(0, length);

    while (length <= base.length) {
      const exists = await this.productModel.findOne({ label });

      if (!exists) {
        return label;
      }

      length++;
      label = base.slice(0, length);
    }

    // If entire string is exhausted and still collision:
    let counter = 1;
    while (true) {
      const candidate = `${base.slice(0, 5)}${counter}`;
      const exists = await this.productModel.findOne({ label: candidate });

      if (!exists) {
        return candidate;
      }

      counter++;
    }
  }
}
