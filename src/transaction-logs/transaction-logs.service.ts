import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionLog,
  TransactionLogDocument,
} from './entities/transaction-log.entity';
import { Model } from 'mongoose';
import { LogEntityType } from './enums/log-entity-type.enum';
import type { LogMetadataMap } from './types/log-metadata-map.type';
import type { UserDocument } from 'src/auth/entities/auth.entity';
import { PerformedBy } from './types/performed-by.type';

type LogActionWithMetadata = keyof LogMetadataMap;

interface CreateLogInput<A extends LogActionWithMetadata> {
  action: A;
  entityType: LogEntityType;
  entityId: string;

  performedBy: UserDocument;

  metadata: LogMetadataMap[A];
}

@Injectable()
export class TransactionLogsService {
  constructor(
    @InjectModel(TransactionLog.name)
    private readonly logModel: Model<TransactionLogDocument>,
  ) {}

  async createLog<A extends LogActionWithMetadata>(
    input: CreateLogInput<A>,
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
    return this.logModel.find().exec();
  }
}
