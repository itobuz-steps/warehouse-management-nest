import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { Batch, BatchDocument } from './schemas/batch.schema';
import { CreateBatchDto } from './dto/create-batch.dto';
import { MarkBatchDamagedDto } from './dto/mark-batch-damaged.dto';
import { Variant, VariantDocument } from '../variant/schemas/variant.schema';
import {
  VariantStock,
  VariantStockDocument,
} from 'src/variant-stock/schemas/variant-stock.schema';
import { TransactionLogsService } from 'src/transaction-logs/transaction-logs.service';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { BatchMarkedDamagedLog } from 'src/transaction-logs/types/batch-log.type';

type BatchProductItem = {
  variant: Types.ObjectId;
  quantity: number;
  remainingQuantity: number;
  damagedQuantity: number;
};

type VariantDamageMap = Map<string, number>;

type FindAllBatchesQuery = {
  search?: string;
  destinationWarehouse?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class BatchService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,

    @InjectModel(Batch.name)
    private readonly batchModel: Model<BatchDocument>,

    @InjectModel(Variant.name)
    private readonly variantModel: Model<VariantDocument>,

    @InjectModel(VariantStock.name)
    private readonly variantStockModel: Model<VariantStockDocument>,

    private readonly logsService: TransactionLogsService,
  ) {}

  async create(dto: CreateBatchDto) {
    const preparedItems: BatchProductItem[] = dto.items.map((item) =>
      this.toBatchProductItem(item.variant, item.quantity),
    );

    const batch = new this.batchModel({
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

  async findAll(query: FindAllBatchesQuery = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter = this.buildFindAllFilter(query);

    const [batches, total] = await Promise.all([
      this.batchModel
        .find(filter)
        .populate('sourceWarehouse')
        .populate('destinationWarehouse')
        .populate('items.variant')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.batchModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Batches retrieved successfully',
      data: batches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildFindAllFilter(
    query: FindAllBatchesQuery,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (query.destinationWarehouse) {
      filter.destinationWarehouse = new Types.ObjectId(
        query.destinationWarehouse,
      );
    }

    const search = query.search?.trim();
    if (search) {
      const escapedSearch = this.escapeRegex(search);
      filter.$expr = {
        $regexMatch: {
          input: { $toString: '$_id' },
          regex: escapedSearch,
          options: 'i',
        },
      };
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async findOne(id: string) {
    return {
      success: true,
      message: 'Batch retrieved successfully',
      data: await this.populateBatchById(id),
    };
  }

  async markDamaged(
    batchId: string,
    dto: MarkBatchDamagedDto,
    user: UserDocument,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const batch = await this.getBatchForDamage(batchId, session);
      const variantDamageMap = this.buildVariantDamageMap(batch, dto);
      const logMetadata = this.buildBatchDamagedLogMetadata(
        batch,
        dto,
        variantDamageMap,
      );

      await this.decrementVariantStocks(
        batch.destinationWarehouse as Types.ObjectId,
        variantDamageMap,
        session,
      );

      await batch.save({ session });
      await session.commitTransaction();

      const logInput = {
        action: 'BATCH_MARKED_DAMAGED',
        entityType: 'BATCH',
        entityId: batch._id.toString(),
        performedBy: user,
        metadata: logMetadata,
      } as unknown as Parameters<TransactionLogsService['createLog']>[0];

      await this.logsService.createLog(logInput);

      return {
        success: true,
        message: 'Batch damaged quantity updated successfully',
        data: await this.populateBatchById(batchId),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private toBatchProductItem(
    variantId: string,
    quantity: number,
  ): BatchProductItem {
    return {
      variant: new Types.ObjectId(variantId),
      quantity,
      remainingQuantity: quantity,
      damagedQuantity: 0,
    };
  }

  private async populateBatchById(id: string) {
    return this.batchModel
      .findById(id)
      .populate('sourceWarehouse')
      .populate('destinationWarehouse')
      .populate('items.variant');
  }

  private async getBatchForDamage(batchId: string, session: ClientSession) {
    const batch = await this.batchModel.findById(batchId).session(session);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (!batch.destinationWarehouse) {
      throw new BadRequestException(
        'Cannot mark damage for a batch without destination warehouse',
      );
    }

    return batch;
  }

  private buildVariantDamageMap(
    batch: BatchDocument,
    dto: MarkBatchDamagedDto,
  ): VariantDamageMap {
    if (dto.variantId) {
      return this.markSingleVariantAsDamaged(
        batch,
        dto.variantId,
        dto.quantity,
      );
    }

    if (dto.quantity !== undefined) {
      throw new BadRequestException(
        'quantity is only allowed when variantId is provided',
      );
    }

    return this.markAllBatchItemsAsDamaged(batch);
  }

  private markSingleVariantAsDamaged(
    batch: BatchDocument,
    variantId: string,
    requestedQuantity?: number,
  ): VariantDamageMap {
    const variantObjectId = new Types.ObjectId(variantId);
    const item = batch.items.find(
      (entry) => entry.variant.toString() === variantObjectId.toString(),
    );

    if (!item) {
      throw new NotFoundException('Variant not found in this batch');
    }

    const available = item.remainingQuantity;
    const damageQty = requestedQuantity ?? available;

    if (damageQty <= 0) {
      throw new BadRequestException('No available quantity to mark damaged');
    }

    if (damageQty > available) {
      throw new BadRequestException(
        'Damaged quantity exceeds available batch quantity',
      );
    }

    item.remainingQuantity -= damageQty;
    item.damagedQuantity = (item.damagedQuantity ?? 0) + damageQty;

    return new Map([[variantObjectId.toString(), damageQty]]);
  }

  private markAllBatchItemsAsDamaged(batch: BatchDocument): VariantDamageMap {
    const variantDamageMap: VariantDamageMap = new Map();

    for (const item of batch.items) {
      const damageQty = item.remainingQuantity;
      if (!damageQty) continue;

      item.remainingQuantity = 0;
      item.damagedQuantity = (item.damagedQuantity ?? 0) + damageQty;

      const key = item.variant.toString();
      variantDamageMap.set(key, (variantDamageMap.get(key) ?? 0) + damageQty);
    }

    if (!variantDamageMap.size) {
      throw new BadRequestException('No available quantity to mark damaged');
    }

    return variantDamageMap;
  }

  private async decrementVariantStocks(
    warehouseId: Types.ObjectId,
    variantDamageMap: VariantDamageMap,
    session: ClientSession,
  ) {
    for (const [variantId, damageQty] of variantDamageMap) {
      const productId = await this.getVariantProductId(variantId, session);

      const stockUpdate = await this.variantStockModel.updateOne(
        {
          variantId: new Types.ObjectId(variantId),
          productId,
          warehouseId,
          quantity: { $gte: damageQty },
        },
        { $inc: { quantity: -damageQty } },
        { session },
      );

      if (!stockUpdate.modifiedCount) {
        throw new BadRequestException(
          `Insufficient available stock to mark damage for variant ${variantId}`,
        );
      }
    }
  }

  private async getVariantProductId(variantId: string, session: ClientSession) {
    const variant = await this.variantModel
      .findById(variantId)
      .select('product')
      .lean()
      .session(session);

    if (!variant?.product) {
      throw new NotFoundException(
        `Variant ${variantId} not found while adjusting stock`,
      );
    }

    return variant.product;
  }

  private buildBatchDamagedLogMetadata(
    batch: BatchDocument,
    dto: MarkBatchDamagedDto,
    variantDamageMap: VariantDamageMap,
  ): BatchMarkedDamagedLog {
    return {
      sourceWarehouseId: batch.sourceWarehouse?.toString(),
      destinationWarehouseId: batch.destinationWarehouse!.toString(),
      damageScope: dto.variantId ? 'SINGLE_VARIANT' : 'FULL_BATCH',
      items: Array.from(variantDamageMap.entries()).map(
        ([variantId, damagedQuantity]) => ({
          variantId,
          damagedQuantity,
        }),
      ),
    };
  }
}
