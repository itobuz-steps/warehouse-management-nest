import { Controller, Get, Query } from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { GetLogsDto } from './dto/get-logs.dto';

@Controller('transaction-logs')
export class TransactionLogsController {
  constructor(
    private readonly transactionLogsService: TransactionLogsService,
  ) {}

  @Get('/filtered')
  getLogs(@Query() query: GetLogsDto) {
    return this.transactionLogsService.getLogs(query);
  }

  @Get()
  findAll() {
    return this.transactionLogsService.findAll();
  }
}
