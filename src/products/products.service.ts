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
    // 1. Create the update object from the DTO
    const updates = { ...updateProductDto };

    // 2. If new images were uploaded, overwrite the productImage field
    if (imageUrls && imageUrls.length > 0) {
      updates['productImage'] = imageUrls;
    }

    // 3. Perform the update
    const updatedProduct = await this.productModel.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }, // Return the updated doc
    );

    // 4. Handle "Not Found"
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
      { isArchived: false }, // Set to false to restore
      { new: true },
    );

    if (!restoredProduct) {
      throw new NotFoundException('Product not found');
    }

    return restoredProduct;
  }

  async generateQrCode(url: string): Promise<Buffer> {
    // Generates a PNG Buffer
    return QRCode.toBuffer(url);
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  //   async findArchived(queryDto: GetProductsQueryDto) {
  //     const { search, category, sort, page = 1, limit = 10 } = queryDto;

  //     // 1. Build Filter (This is the key difference: isArchived = TRUE)
  //     const filter: mongoose.FilterQuery<ProductDocument> = { isArchived: true };

  //     if (category) {
  //       filter.category = category;
  //     }

  //     if (search) {
  //       filter.name = { $regex: search, $options: 'i' };
  //     }

  //     // 2. Build Query
  //     let query = this.productModel.find(filter).populate('createdBy');

  //     // 3. Handle Sorting
  //     if (sort) {
  //       const sortOptions: Record<string, 1 | -1> = {};
  //       if (sort === 'name_asc') sortOptions.name = 1;
  //       else if (sort === 'name_desc') sortOptions.name = -1;
  //       else if (sort === 'category_asc') sortOptions.category = 1;
  //       else sortOptions.createdAt = -1;

  //       query = query.sort(sortOptions);
  //     } else {
  //       query = query.sort({ createdAt: -1 });
  //     }

  //     // 4. Pagination
  //     const skip = (page - 1) * limit;

  //     // 5. Execute
  //     const [products, totalCount] = await Promise.all([
  //       query.skip(skip).limit(limit).exec(),
  //       this.productModel.countDocuments(filter).exec(),
  //     ]);

  //     const totalPages = Math.ceil(totalCount / limit);

  //     return {
  //       products,
  //       totalCount,
  //       totalPages,
  //       currentPage: page,
  //       productsPerPage: limit,
  //     };
  //   }
}
