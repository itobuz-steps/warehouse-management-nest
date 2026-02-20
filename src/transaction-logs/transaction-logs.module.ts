import { Module } from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { TransactionLogsController } from './transaction-logs.controller';

@Module({
  controllers: [TransactionLogsController],
  providers: [TransactionLogsService],
})
export class TransactionLogsModule {}
