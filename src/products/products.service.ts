import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-product-query.dto';
import { updateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { SORT_CATEGORY } from './constants/product.constant';
import * as QRCode from 'qrcode';
import { SortOrder } from 'mongoose';
import { VariantService } from 'src/variant/variant.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,

    private readonly variantService: VariantService,
  ) {}

  async getProducts(queryDto: GetProductsQueryDto) {
    const { search, category, sort, page = '1', limit = '10' } = queryDto;

    const filter: QueryFilter<ProductDocument> = { isArchived: false };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    let query = this.productModel.find(filter).populate('createdBy');

    if (sort) {
      if (sort === SORT_CATEGORY.NAME_ASC) {
        query = query.sort({ name: 1 });
      } else if (sort === SORT_CATEGORY.NAME_DESC) {
        query = query.sort({ name: -1 });
      } else if (sort === SORT_CATEGORY.CATEGORY_ASC) {
        query = query.sort({ category: 1 });
      } else {
        query = query.sort({ createdAt: -1 });
      }
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const pageNumber = Math.max(parseInt(page, 10), 1);
    const limitNumber = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const [products, totalCount] = await Promise.all([
      query.skip(skip).limit(limitNumber).exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalCount / limitNumber);

    return {
      products,
      totalCount,
      totalPages,
      currentPage: pageNumber,
      productsPerPage: limitNumber,
    };
  }

  async update(
    id: string,
    updateProductDto: updateProductDto,
    imageUrls?: string[],
  ) {
    const updates = { ...updateProductDto };

    if (imageUrls && imageUrls.length > 0) {
      updates['productImage'] = imageUrls;
    }

    const updatedProduct = await this.productModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updates,
      { new: true, runValidators: true },
    );

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async create(createProductDto: CreateProductDto, imageUrls: string[]) {
    const session = await this.productModel.db.startSession();
    session.startTransaction();

    try {
      const normalizedName = createProductDto.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      const label = await this.generateUniqueLabel(normalizedName);

      const product = await new this.productModel({
        ...createProductDto,
        label,
        productImage: imageUrls,
        variantCount: 0,
      }).save({ session });

      const attributes =
        createProductDto.variantAttributes &&
        Object.keys(createProductDto.variantAttributes).length > 0
          ? createProductDto.variantAttributes
          : {};

      await this.variantService.createInternal(
        product._id.toString(),
        attributes,
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

  async remove(id: string) {
    const archivedProduct = await this.productModel.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true },
    );

    if (!archivedProduct) {
      throw new NotFoundException('Product not found');
    }

    return archivedProduct;
  }

  async restore(id: string) {
    const restoredProduct = await this.productModel.findByIdAndUpdate(
      id,
      { isArchived: false },
      { new: true },
    );

    if (!restoredProduct) {
      throw new NotFoundException('Product not found');
    }

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
