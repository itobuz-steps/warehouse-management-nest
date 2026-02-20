import { Controller, Get, Param, Delete } from '@nestjs/common';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionLogsService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionLogsService.remove(+id);
  }
}
