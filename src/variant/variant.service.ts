import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Variant, VariantDocument } from './schemas/variant.schema';
import { CreateVariantDto } from './dto/create-variant.dto';
import { Product, ProductDocument } from 'src/products/entities/product.entity';
import { StorageService } from 'src/storage/storage.service';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { UpdateVariantDto } from './dto/update-variant.dto';
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
    const br = this.normalize(brand, brand.length);
    const prod = this.normalize(productLabel, productLabel.length);
    const variant = this.generateVariantCode(attributes);

    return `${cat}-${br}-${prod}-${variant}`;
  }

  async create(dto: CreateVariantDto, user: UserDocument) {
    const data = await this.createInternal(
      dto.product,
      dto.attributes,
      dto.price,
      dto.markup,
      dto.variantImage || [],
      user,
    );

    return {
      success: true,
      message: 'Variant created successfully',
      data,
    };
  }

  async update(id: string, dto: UpdateVariantDto) {
    const data = await this.variantModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      dto,
    );

    return {
      success: true,
      message: 'Variant Updated successfully',
      data,
    };
  }

  async findById(variantId: string) {
    const variant = await this.variantModel
      .findById(new Types.ObjectId(variantId))
      .lean();

    if (!variant) {
      return { success: false, message: 'Variant not found', data: null };
    }

    const imageUrls: string[] = await Promise.all(
      variant.variantImage.map((key: string) =>
        this.storageService.getPresignedSignedUrl(key),
      ),
    );

    return {
      success: true,
      message: 'Variant retrieved successfully',
      data: {
        ...variant,
        variantImage: imageUrls,
      },
    };
  }

  async findByProductId(
    productId: string,
    warehouseId: string,
    hasStock: boolean,
  ) {
    if (!hasStock) {
      const variants = await this.variantModel.find({
        product: new Types.ObjectId(productId),
      });

      if (!variants) throw new Error('Variants not Found');

      for (const variant of variants) {
        variant.variantImage = await Promise.all(
          variant.variantImage.map((key: string) =>
            this.storageService.getPresignedSignedUrl(key),
          ),
        );
      }

      return {
        success: true,
        message: 'Variants retrieved successfully',
        data: variants,
      };
    }

    const variants: Variant[] = await this.variantModel.aggregate([
      {
        $match: { product: new Types.ObjectId(productId) },
      },
      {
        $lookup: {
          from: 'variantstocks',
          let: { variantId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$variantId', '$$variantId'] },
                    ...(warehouseId
                      ? [
                          {
                            $eq: [
                              '$warehouseId',
                              new Types.ObjectId(warehouseId),
                            ],
                          },
                        ]
                      : []),
                  ],
                },
              },
            },
          ],
          as: 'stockEntries',
        },
      },
      // Sum stock entries — variants with no entries get quantity: 0
      {
        $addFields: {
          quantity: { $sum: '$stockEntries.quantity' },
        },
      },
      // All variants are returned; quantity: 0 means no stock in that warehouse
      {
        $project: { stockEntries: 0 },
      },
    ]);

    for (const variant of variants) {
      if (variant.variantImage?.length) {
        variant.variantImage = await Promise.all(
          variant.variantImage.map((key: string) =>
            this.storageService.getPresignedSignedUrl(key),
          ),
        );
      }
    }

    return {
      success: true,
      message: 'Variants retrieved based on product id successfully',
      data: variants,
    };
  }

  async createInternal(
    productId: string,
    attributes: Record<string, string> = {},
    price: number,
    markup?: number,
    imageUrls: string[] = [],
    user?: UserDocument,
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
      action: LOG_ACTION.VARIANT_CREATED,
      entityType: LOG_ENTITY_TYPE.VARIANT,
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
