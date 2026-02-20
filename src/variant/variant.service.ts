import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Variant, VariantDocument } from './schemas/variant.schema';
import { CreateVariantDto } from './dto/create-variant.dto';
import { Product, ProductDocument } from 'src/products/entities/product.entity';
@Injectable()
export class VariantService {
  constructor(
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  private normalize(value: string, length = 5): string {
    if (!value) {
      throw new BadRequestException('Invalid SKU field: value is missing');
    }

    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, length);
  }

  private generateVariantCode(attributes?: Record<string, string>): string {
    if (!attributes || Object.keys(attributes).length === 0) {
      return 'BASE';
    }

    const sortedKeys = Object.keys(attributes).sort();

    return sortedKeys.map((key) => this.normalize(attributes[key], 6)).join('');
  }

  private generateSku(
    category: string,
    brand: string,
    productLabel: string,
    attributes: Record<string, string>,
  ): string {
    const cat = this.normalize(category, 4);
    const br = this.normalize(brand, 4);
    const prod = this.normalize(productLabel, 6);
    const variant = this.generateVariantCode(attributes);

    return `${cat}-${br}-${prod}-${variant}`;
  }

  async create(dto: CreateVariantDto) {
    const data = await this.createInternal(dto.product, dto.attributes || {});

    return {
      success: true,
      message: 'Variant created successfully',
      data,
    };
  }

  async findByProduct(productId: string) {
    return {
      success: true,
      message: 'Variants retrieved successfully',
      data: await this.variantModel.find({
        product: new Types.ObjectId(productId),
      }),
    };
  }

  async createInternal(
    productId: string,
    attributes: Record<string, string> = {},
    session?: ClientSession,
  ) {
    const product = await this.productModel
      .findById(productId)
      .session(session || null);

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const sku = this.generateSku(
      product.category,
      product.brand,
      product.label,
      attributes || {},
    );

    const existing = await this.variantModel
      .findOne({ sku })
      .session(session || null);

    if (existing) {
      throw new BadRequestException('Variant already exists');
    }

    const variant = new this.variantModel({
      product: new Types.ObjectId(productId),
      attributes,
      sku,
    }).save({ session });

    await this.productModel.updateOne(
      { _id: productId },
      { $inc: { variantCount: 1 } },
      { session },
    );

    return variant;
  }
}
