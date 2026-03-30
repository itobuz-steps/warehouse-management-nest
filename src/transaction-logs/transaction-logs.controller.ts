import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { GetLogsDto } from './dto/get-logs.dto';

@Controller('transaction-logs')
export class TransactionLogsController {
  constructor(
    private readonly transactionLogsService: TransactionLogsService,
  ) {}

  @Post('/filtered')
  getLogs(@Body() body: GetLogsDto) {
    return this.transactionLogsService.getLogs(body);
  }

  @Get()
  findAll() {
    return this.transactionLogsService.findAll();
  }

  @Get('/timeline/:entityId')
  getEntityTimeline(@Param('entityId') entityId: string) {
    return this.transactionLogsService.getEntityTimeline(entityId);
  }

  @Get('/analytics')
  getAnalytics() {
    return this.transactionLogsService.getAllAnalytics();
  }
}
