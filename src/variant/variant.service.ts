import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Variant, VariantDocument } from './schemas/variant.schema';
import { CreateVariantDto } from './dto/create-variant.dto';
import { Product, ProductDocument } from 'src/products/entities/product.entity';
import { StorageService } from 'src/storage/storage.service';
import { LogAction } from 'src/transaction-logs/enums/log-action.enum';
import { LogEntityType } from 'src/transaction-logs/enums/log-entity-type.enum';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
@Injectable()
export class VariantService {
  constructor(
    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    private readonly storageService: StorageService,

    private readonly logsService: TransactionLogsService,
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
    const data = await this.createInternal(
      dto.product,
      dto.attributes,
      dto.price,
      dto.markup,
      dto.productImage || [],
    );

    return {
      success: true,
      message: 'Variant created successfully',
      data,
    };
  }

  // async findByProduct(productId: string) {
  //   return {
  //     success: true,
  //     message: 'Variants retrieved successfully',
  //     data: await this.variantModel.find({
  //       product: new Types.ObjectId(productId),
  //     }),
  //   };
  // }

  async findByProduct(productId: string) {
    const variants = await this.variantModel
      .find({ product: new Types.ObjectId(productId) })
      .lean();

    const variantsWithUrls = await Promise.all(
      variants.map(async (variant) => {
        const imageUrls = await Promise.all(
          variant.variantImage.map((key: string) =>
            this.storageService.getPresignedSignedUrl(key),
          ),
        );

        return {
          ...variant,
          variantImage: imageUrls,
        };
      }),
    );

    return {
      success: true,
      message: 'Variants retrieved successfully',
      data: variantsWithUrls,
    };
  }

  async createInternal(
    productId: string,
    attributes: Record<string, string> = {},
    price: number,
    markup?: number,
    imageUrls: string[] = [],
    session?: ClientSession,
    user?: UserDocument,
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
      attributes,
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
      variantImage: imageUrls,
      price,
      markup,
      sku,
    }).save({ session });

    await this.logsService.createLog({
      action: LogAction.VARIANT_CREATED,
      entityType: LogEntityType.VARIANT,
      entityId: (await variant)._id.toHexString(),
      performedBy: user as UserDocument,
      metadata: {
        productId: product._id,
        productName: product.name,
        sku: sku,
        price: price,
        markup: markup as number,
        attributes: attributes,
        variantImage: imageUrls,
      },
    });

    await this.productModel.updateOne(
      { _id: productId },
      { $inc: { variantCount: 1 } },
      { session },
    );

    return variant;
  }
}
