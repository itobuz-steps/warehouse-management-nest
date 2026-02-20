import { Module } from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { TransactionLogsController } from './transaction-logs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransactionLog,
  TransactionLogSchema,
} from './entities/transaction-log.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransactionLog.name, schema: TransactionLogSchema },
    ]),
  ],
  controllers: [TransactionLogsController],
  providers: [TransactionLogsService],
  exports: [TransactionLogsService],
})
export class TransactionLogsModule {}
