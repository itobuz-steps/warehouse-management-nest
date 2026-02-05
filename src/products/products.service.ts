// src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-product-query.dto';
import { updateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import * as QRCode from 'qrcode';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async getProducts(queryDto: GetProductsQueryDto) {
    const { search, category, sort, page = '1', limit = '10' } = queryDto;

    // Build filter
    const filter: Record<string, any> = { isArchived: false };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // Build query
    let query = this.productModel.find(filter).populate('createdBy');

    // Apply sorting
    if (sort) {
      if (sort === 'name_asc') {
        query = query.sort({ name: 1 });
      } else if (sort === 'name_desc') {
        query = query.sort({ name: -1 });
      } else if (sort === 'category_asc') {
        query = query.sort({ category: 1 });
      } else {
        query = query.sort({ createdAt: -1 });
      }
    } else {
      query = query.sort({ createdAt: -1 }); // default sort
    }

    // Pagination
    const pageNumber = Math.max(parseInt(page, 10), 1);
    const limitNumber = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNumber - 1) * limitNumber;

    // Execute queries in parallel
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
      id,
      updates,
      { new: true, runValidators: true }, // Return the updated doc
    );

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async create(createProductDto: CreateProductDto, imageUrls: string[]) {
    // 1. Create the new product instance
    // Note: Mongoose automatically converts 'createdBy' string to ObjectId
    // because you defined it as ObjectId in the Schema.
    const createdProduct = new this.productModel({
      ...createProductDto,
      productImage: imageUrls, // Add the image URLs here
    });

    // 2. Save to database
    return createdProduct.save();
  }

  async remove(id: string) {
    const archivedProduct = await this.productModel.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true },
    );

    if (!archivedProduct) {
      // This replaces res.status(404) + throw Error
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
    const product = await this.productModel.findById(id).exec();

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

    // 3. Sorting (simplified map)
    const sortMap: Record<string, any> = {
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      category_asc: { category: 1 },
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
}
