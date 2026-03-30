import { Module } from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { TransactionLogsController } from './transaction-logs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransactionLog,
  TransactionLogSchema,
} from './entities/transaction-log.entity';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransactionLog.name, schema: TransactionLogSchema },
    ]),
    StorageModule,
  ],
  controllers: [TransactionLogsController],
  providers: [TransactionLogsService],
  exports: [TransactionLogsService],
})
export class TransactionLogsModule {}
