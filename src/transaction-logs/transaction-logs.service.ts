import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionLog,
  TransactionLogDocument,
} from './entities/transaction-log.entity';
import { Model, PipelineStage, Types } from 'mongoose';
import { LOG_ENTITY_TYPE } from './enums/log-entity-type.enum';
import type { LogMetadataMap } from './types/log-metadata-map.type';
import type { UserDocument } from 'src/auth/entities/auth.entity';
import { PerformedBy } from './types/performed-by.type';
import { GetLogsDto } from './dto/get-logs.dto';
import { StorageService } from 'src/storage/storage.service';
import { USER_TYPES } from 'src/auth/userType';
import {
  Warehouse,
  WarehouseDocument,
} from 'src/warehouse/schemas/warehouse.schema';
import { LOG_ACTION } from './enums/log-action.enum';

type DateRangeFilter = {
  $gte?: Date;
  $lte?: Date;
};

type CountResult = {
  total: number;
};

type UserWithImage = {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  profileImageKey?: string;
};

type LogWithUser = {
  _id?: Types.ObjectId | string;
  action?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: Date | string;
  performedBy: {
    userId: UserWithImage;
  };
};

type LOG_ACTIONWithMetadata = keyof LogMetadataMap;

type CreateLogInput<Action extends LOG_ACTIONWithMetadata> = {
  action: Action;
  entityType: LOG_ENTITY_TYPE;
  entityId: string;

  performedBy: UserDocument;

  metadata: LogMetadataMap[Action];
};

@Injectable()
export class TransactionLogsService {
  constructor(
    @InjectModel(TransactionLog.name)
    private readonly logModel: Model<TransactionLogDocument>,
    @InjectModel(Warehouse.name)
    private warehouseModel: Model<WarehouseDocument>,
    private readonly storageService: StorageService,
  ) {}

  async createLog<Action extends LOG_ACTIONWithMetadata>(
    input: CreateLogInput<Action>,
  ): Promise<void> {
    const performedBy: PerformedBy = {
      userId: input.performedBy._id,
    };

    await this.logModel.create({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      performedBy,
      metadata: input.metadata,
    });
  }

  async findAll(): Promise<TransactionLogDocument[]> {
    return this.logModel
      .find()
      .populate({
        path: 'performedBy.userId',
        model: 'User',
        select: 'name',
      })
      .exec();
  }

  async getLogs(query: GetLogsDto, currentUser: UserDocument) {
    const {
      action,
      entityType,
      userId,
      search,
      page = 1,
      limit = 10,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;
    const match: PipelineStage.Match['$match'] = {};

    //Manager scope
    if (currentUser.role === USER_TYPES.MANAGER) {
      const assignedWarehouses = await this.warehouseModel
        .find(
          { managerIds: new Types.ObjectId(currentUser._id), active: true },
          { _id: 1 },
        )
        .lean();

      if (!assignedWarehouses.length) {
        return { data: [], total: 0, page, limit };
      }

      const wIds = assignedWarehouses.map((w) => w._id.toString());

      const stockActions = [
        LOG_ACTION.STOCK_IN,
        LOG_ACTION.STOCK_OUT,
        LOG_ACTION.STOCK_ADJUSTED,
        LOG_ACTION.STOCK_TRANSFER,
      ];

      const warehouseActions = [
        LOG_ACTION.WAREHOUSE_CREATED,
        LOG_ACTION.WAREHOUSE_UPDATED,
        LOG_ACTION.WAREHOUSE_DELETED,
        LOG_ACTION.WAREHOUSE_ACTIVATED,
        LOG_ACTION.WAREHOUSE_DEACTIVATED,
      ];

      const batchActions = [LOG_ACTION.BATCH_MARKED_DAMAGED];

      match.$or = [
        {
          action: {
            $nin: [...stockActions, ...warehouseActions, ...batchActions],
          },
        },

        {
          action: LOG_ACTION.STOCK_IN,
          'metadata.destinationWarehouse.warehouseId': { $in: wIds },
        },
        {
          action: LOG_ACTION.STOCK_OUT,
          'metadata.sourceWarehouse.warehouseId': { $in: wIds },
        },
        {
          action: LOG_ACTION.STOCK_ADJUSTED,
          'metadata.destinationWarehouse.warehouseId': { $in: wIds },
        },
        {
          action: LOG_ACTION.STOCK_TRANSFER,
          'metadata.sourceWarehouse.warehouseId': { $in: wIds },
        },
        {
          action: LOG_ACTION.STOCK_TRANSFER,
          'metadata.destinationWarehouse.warehouseId': { $in: wIds },
        },
        {
          action: { $in: stockActions },
          'performedBy.userId': new Types.ObjectId(currentUser._id),
        },

        {
          action: { $in: warehouseActions },
          entityId: { $in: wIds },
        },

        {
          action: { $in: batchActions },
          'metadata.destinationWarehouseId': {
            $in: wIds,
          },
        },
      ];
    }

    if (action?.length) {
      match.action = { $in: action };
    }

    if (entityType?.length) {
      match.entityType = { $in: entityType };
    }

    if (userId) {
      match['performedBy.userId'] = new Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      const range: DateRangeFilter = {};

      if (startDate) {
        range.$gte = new Date(startDate);
      }

      if (endDate) {
        range.$lte = new Date(endDate);
      }

      match.createdAt = range;
    }

    const basePipeline: PipelineStage[] = [
      { $match: match },

      {
        $lookup: {
          from: 'users',
          localField: 'performedBy.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      basePipeline.push({
        $match: {
          $or: [
            { entityId: { $regex: search, $options: 'i' } },
            { 'metadata.productName': { $regex: search, $options: 'i' } },
            { 'metadata.sku': { $regex: search, $options: 'i' } },
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    const dataPipeline: PipelineStage[] = [
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      {
        $addFields: {
          performedBy: {
            userId: {
              _id: '$user._id',
              name: '$user.name',
              email: '$user.email',
              profileImage: '$user.profileImage',
              profileImageKey: '$user.profileImageKey',
            },
          },
        },
      },

      {
        $project: {
          user: 0,
        },
      },
    ];

    const countPipeline: PipelineStage[] = [
      ...basePipeline,
      { $count: 'total' },
    ];

    const [logs, totalResult] = await Promise.all([
      this.logModel.aggregate<LogWithUser>(dataPipeline),
      this.logModel.aggregate<CountResult>(countPipeline),
    ]);

    const total = totalResult[0]?.total ?? 0;

    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = log.performedBy?.userId;

        if (!user) {
          return log;
        }

        let profileImageUrl: string | undefined;

        if (user.profileImageKey) {
          profileImageUrl = await this.storageService.getPresignedSignedUrl(
            user.profileImageKey,
          );
        } else if (user.profileImage) {
          profileImageUrl = user.profileImage;
        }

        return {
          ...log,
          performedBy: {
            userId: {
              ...user,
              profileImage: profileImageUrl,
            },
          },
        };
      }),
    );

    return {
      data: enrichedLogs,
      total,
      page,
      limit,
    };
  }

  async exportLogsCsv(
    query: GetLogsDto,
    currentUser: UserDocument,
  ): Promise<string> {
    const { data } = await this.getLogs(query, currentUser);

    const headers = [
      'id',
      'action',
      'entityType',
      'entityId',
      'performedByName',
      'performedByEmail',
      'createdAt',
    ];

    const toCellString = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return String(value);
      }

      if (value instanceof Date || value instanceof Types.ObjectId) {
        return value.toString();
      }

      return '';
    };

    const escapeCsvValue = (value: string): string =>
      `"${value.replace(/"/g, '""')}"`;

    const rows = data.map((log) => {
      const user = log.performedBy?.userId;

      const values = [
        toCellString(log._id),
        toCellString(log.action),
        toCellString(log.entityType),
        toCellString(log.entityId),
        toCellString(user?.name),
        toCellString(user?.email),
        toCellString(log.createdAt),
      ];

      return values.map((value) => escapeCsvValue(value)).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  async getEntityTimeline(entityId: string) {
    const match: PipelineStage.Match['$match'] = {
      entityId,
    };

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'performedBy.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $addFields: {
          performedBy: {
            userId: {
              _id: '$user._id',
              name: '$user.name',
              email: '$user.email',
              profileImage: '$user.profileImage',
              profileImageKey: '$user.profileImageKey',
            },
          },
        },
      },
      {
        $project: {
          user: 0,
        },
      },
    ];

    const logs = await this.logModel.aggregate<LogWithUser>(pipeline);

    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = log.performedBy?.userId;

        if (!user) return log;

        let profileImageUrl: string | undefined;

        if (user.profileImageKey) {
          profileImageUrl = await this.storageService.getPresignedSignedUrl(
            user.profileImageKey,
          );
        } else if (user.profileImage) {
          profileImageUrl = user.profileImage;
        }

        return {
          ...log,
          performedBy: {
            userId: {
              ...user,
              profileImage: profileImageUrl,
            },
          },
        };
      }),
    );

    return enrichedLogs;
  }

  async getAllAnalytics() {
    const [updatedProducts, variantProducts, topEntities, warehouses] =
      await Promise.all([
        this.getMostUpdatedProducts(),
        this.getProductsWithMostVariants(),
        this.getTopUpdatedEntities(),
        this.getMostActiveWarehouses(),
      ]);

    return {
      updatedProducts,
      variantProducts,
      topEntities,
      warehouses,
    };
  }

  async getMostUpdatedProducts() {
    return this.logModel.aggregate([
      { $match: { action: 'PRODUCT_UPDATED' } },

      {
        $project: {
          productId: '$entityId',
          name: '$metadata.newValue.name',
          fallbackName: '$metadata.oldValue.name',
        },
      },

      {
        $addFields: {
          name: { $ifNull: ['$name', '$fallbackName'] },
        },
      },

      {
        $group: {
          _id: '$productId',
          name: { $first: '$product.name' },
          count: { $sum: 1 },
        },
      },

      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  async getProductsWithMostVariants() {
    return this.logModel.aggregate([
      { $match: { action: 'VARIANT_CREATED' } },

      {
        $project: {
          productId: '$metadata.variant.productId',
          name: '$metadata.variant.productName',
        },
      },

      {
        $group: {
          _id: '$productId',
          name: { $first: 'name' },
          count: { $sum: 1 },
        },
      },

      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  async getTopUpdatedEntities() {
    return this.logModel.aggregate([
      {
        $match: {
          action: { $in: ['CUSTOMER_UPDATED', 'SUPPLIER_UPDATED'] },
        },
      },

      {
        $project: {
          entityId: '$entityId',
          type: '$entityType',
          name: '$metadata.newValue.name',
          email: '$metadata.newValue.email',
        },
      },

      {
        $group: {
          _id: '$entityId',
          type: { $first: '$type' },
          name: { $first: '$name' },
          email: { $first: '$email' },
          count: { $sum: 1 },
        },
      },

      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  async getMostActiveWarehouses() {
    return this.logModel.aggregate([
      {
        $match: {
          action: {
            $in: ['STOCK_IN', 'STOCK_OUT', 'STOCK_TRANSFER', 'STOCK_ADJUSTED'],
          },
        },
      },

      {
        $project: {
          name: {
            $ifNull: [
              '$metadata.sourceWarehouse.name',
              '$metadata.destinationWarehouse.name',
            ],
          },
        },
      },

      {
        $group: {
          _id: '$name',
          count: { $sum: 1 },
        },
      },

      {
        $project: {
          name: '$_id',
          count: 1,
          _id: 0,
        },
      },

      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }
}
