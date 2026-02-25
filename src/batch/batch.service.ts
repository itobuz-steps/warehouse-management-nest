import { Injectable /*BadRequestException*/ } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Batch, BatchDocument } from './schemas/batch.schema';
import { CreateBatchDto } from './dto/create-batch.dto';
import { Variant, VariantDocument } from '../variant/schemas/variant.schema';
// import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';

type BatchProductItem = {
  variant: Types.ObjectId;
  quantity: number;
};

@Injectable()
export class BatchService {
  constructor(
    @InjectModel(Batch.name)
    private readonly batchModel: Model<BatchDocument>,

    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,
  ) {}

  // private validateWarehouses(source?: string, destination?: string) {
  //   if (type === TRANSACTION_TYPES.TRANSFER) {
  //     if (!source || !destination) {
  //       throw new BadRequestException(
  //         'Transfer requires both source and destination warehouses',
  //       );
  //     }
  //     if (source === destination) {
  //       throw new BadRequestException(
  //         'Source and destination cannot be the same',
  //       );
  //     }
  //   }

  //   if (type === TRANSACTION_TYPES.IN && !destination) {
  //     throw new BadRequestException('Stock In requires destination warehouse');
  //   }

  //   if (type === TRANSACTION_TYPES.OUT && !source) {
  //     throw new BadRequestException('Stock Out requires source warehouse');
  //   }
  // }

  async create(dto: CreateBatchDto) {
    // this.validateWarehouses(dto.sourceWarehouse, dto.destinationWarehouse);

    const preparedItems: BatchProductItem[] = [];

    for (const item of dto.items) {
      preparedItems.push({
        variant: new Types.ObjectId(item.variant),
        quantity: item.quantity,
      });
    }

    const batch = new this.batchModel({
      // transactionType: dto.transactionType,
      sourceWarehouse: new Types.ObjectId(dto.sourceWarehouse),
      destinationWarehouse: new Types.ObjectId(dto.destinationWarehouse),
      items: preparedItems,
    });

    return {
      success: true,
      message: 'Batch created successfully',
      data: await batch.save(),
    };
  }

  async findAll() {
    return {
      success: true,
      message: 'Batches retrieved successfully',
      data: await this.batchModel
        .find()
        .populate('sourceWarehouse')
        .populate('destinationWarehouse')
        .populate('items.variant')
        .sort({ createdAt: -1 }),
      // .lean(); // will implement later if needed for performance optimization
    };
  }

  async findOne(id: string) {
    return {
      success: true,
      message: 'Batch retrieved successfully',
      data: await this.batchModel
        .findById(id)
        .populate('sourceWarehouse')
        .populate('destinationWarehouse')
        .populate('items.variant'),
    };
  }
}
