import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { TransactionLogsService } from './transaction-logs.service';
import { GetLogsDto } from './dto/get-logs.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import type { RequestWithUser } from 'src/profile/profile.controller';
import type { Response } from 'express';

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

  @Post('/filtered/export/csv')
  @UseGuards(AuthGuard)
  async exportLogsCsv(
    @Body() body: GetLogsDto,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const csv = await this.transactionLogsService.exportLogsCsv(body, req.user);

    const timestamp = new Date().toISOString().slice(0, 10);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=audit-logs-${timestamp}.csv`,
    });

    return res.send(csv);
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
