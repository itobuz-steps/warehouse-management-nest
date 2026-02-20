import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  TransactionLog,
  TransactionLogDocument,
} from './entities/transaction-log.entity';
import { Model } from 'mongoose';
import { LogEntityType } from './enums/log-entity-type.enum';
import { ActionUser } from 'src/common/types/action-user.type';
import type { LogMetadataMap } from './types/log-metadata-map.type';

type LogActionWithMetadata = keyof LogMetadataMap;

interface CreateLogInput<A extends LogActionWithMetadata> {
  action: A;
  entityType: LogEntityType;
  entityId: string;
  performedBy: ActionUser;
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
    await this.logModel.create(input);
  }

  async findAll(): Promise<TransactionLogDocument[]> {
    return this.logModel.find().exec();
  }
}
