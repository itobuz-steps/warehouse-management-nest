import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { Warehouse, WarehouseSchema } from './schemas/warehouse.schema';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import {
  Quantity,
  QuantitySchema,
} from 'src/quantity/entities/quantity.entity';
import { TransactionLogsModule } from 'src/transaction-logs/transaction-logs.module';
import { StorageService } from 'src/storage/storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: User.name, schema: UserSchema },
      { name: Quantity.name, schema: QuantitySchema },
    ]),
    TransactionLogsModule,
  ],
  controllers: [WarehouseController],
  providers: [WarehouseService, StorageService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
