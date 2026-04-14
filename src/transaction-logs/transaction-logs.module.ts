import { Module } from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { TransactionLogsController } from './transaction-logs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransactionLog,
  TransactionLogSchema,
} from './entities/transaction-log.entity';
import { StorageModule } from 'src/storage/storage.module';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import {
  Warehouse,
  WarehouseSchema,
} from 'src/warehouse/schemas/warehouse.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransactionLog.name, schema: TransactionLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Warehouse.name, schema: WarehouseSchema },
    ]),
    StorageModule,
  ],
  controllers: [TransactionLogsController],
  providers: [TransactionLogsService],
  exports: [TransactionLogsService],
})
export class TransactionLogsModule {}
