import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
// import { Quantity, QuantitySchema } from '../quantity/schemas/quantity.schema';
import {
  Warehouse,
  WarehouseSchema,
} from '../warehouse/schemas/warehouse.schema';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import { PdfService } from './services/pdf.service';
// import Notification from '../utils/Notification';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      // { name: Quantity.name, schema: QuantitySchema },
      { name: Warehouse.name, schema: WarehouseSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService, PdfService], //Notification
})
export class TransactionModule {}
