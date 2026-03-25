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

  async getLogs(query: GetLogsDto) {
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

    if (action) match.action = action;
    if (entityType) match.entityType = entityType;

    if (userId) {
      match['performedBy.userId'] = new Types.ObjectId(userId);
    }

    if (startDate || endDate) {
      const createdAtFilter: DateRangeFilter = {};

      if (startDate) createdAtFilter.$gte = new Date(startDate);
      if (endDate) createdAtFilter.$lte = new Date(endDate);

      match.createdAt = createdAtFilter;
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

      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (search) {
      const searchStage: PipelineStage.Match = {
        $match: {
          $or: [
            { entityId: { $regex: search, $options: 'i' } },
            { 'metadata.productName': { $regex: search, $options: 'i' } },
            { 'metadata.sku': { $regex: search, $options: 'i' } },
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
          ],
        },
      };

      basePipeline.push(searchStage);
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

    return {
      data: enrichedLogs,
      total,
      page,
      limit,
    };
  }
}
