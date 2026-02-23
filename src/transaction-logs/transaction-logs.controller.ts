import { Controller, Get } from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';

@Controller('transaction-logs')
export class TransactionLogsController {
  constructor(
    private readonly transactionLogsService: TransactionLogsService,
  ) {}

  @Get()
  findAll() {
    return this.transactionLogsService.findAll();
  }
}
