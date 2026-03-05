import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionLog,
  TransactionLogDocument,
} from './entities/transaction-log.entity';
import { Model } from 'mongoose';
import { LOG_ENTITY_TYPE } from './enums/log-entity-type.enum';
import type { LogMetadataMap } from './types/log-metadata-map.type';
import type { UserDocument } from 'src/auth/entities/auth.entity';
import { PerformedBy } from './types/performed-by.type';

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
}
