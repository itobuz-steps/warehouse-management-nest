import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { User, UserSchema } from 'src/auth/entities/auth.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from './entities/customer.entity';
import { TransactionLogsModule } from 'src/transaction-logs/transaction-logs.module';
import {
  Transaction,
  TransactionSchema,
} from 'src/transaction/schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    TransactionLogsModule,
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
