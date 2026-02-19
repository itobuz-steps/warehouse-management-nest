import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  private generateVariantCode(attributes: Record<string, string>): string {
    if (!attributes) return 'BASE';

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
    const product = await this.productModel.findById(dto.product);

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const sku = this.generateSku(
      product.category,
      product.brand,
      product.label,
      dto.attributes || {},
    );

    const existing = await this.variantModel.findOne({ sku });
    if (existing) {
      throw new BadRequestException('Variant already exists');
    }

    const variant = new this.variantModel({
      product: new Types.ObjectId(dto.product),
      attributes: dto.attributes,
      sku,
    });

    return variant.save();
  }

  async findByProduct(productId: string) {
    return this.variantModel.find({ product: new Types.ObjectId(productId) });
  }
}
