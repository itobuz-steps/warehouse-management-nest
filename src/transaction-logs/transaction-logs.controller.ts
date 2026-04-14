import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { GetLogsDto } from './dto/get-logs.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import type { RequestWithUser } from 'src/profile/profile.controller';

@Controller('transaction-logs')
export class TransactionLogsController {
  constructor(
    private readonly transactionLogsService: TransactionLogsService,
  ) {}

  @Post('/filtered')
  @UseGuards(AuthGuard)
  getLogs(@Body() body: GetLogsDto, @Req() req: RequestWithUser) {
    return this.transactionLogsService.getLogs(body, req.user);
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
