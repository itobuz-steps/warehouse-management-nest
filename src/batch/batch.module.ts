import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Batch, BatchSchema } from './schemas/batch.schema';
import { Variant, VariantSchema } from 'src/variant/schemas/variant.schema';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import {
  VariantStock,
  VariantStockSchema,
} from 'src/variant-stock/schemas/variant-stock.schema';
import { TransactionLogsModule } from 'src/transaction-logs/transaction-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Batch.name, schema: BatchSchema },
      { name: Variant.name, schema: VariantSchema },
      { name: User.name, schema: UserSchema },
      { name: VariantStock.name, schema: VariantStockSchema },
    ]),
    TransactionLogsModule,
  ],
  controllers: [BatchController],
  providers: [BatchService],
  exports: [BatchService],
})
export class BatchModule {}
