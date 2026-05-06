import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { MarkBatchDamagedDto } from './dto/mark-batch-damaged.dto';
import { GetBatchesQueryDto } from './dto/get-batches-query.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import type { RequestWithUser } from 'src/profile/profile.controller';
import type { RequestWithUserDocument } from 'src/transaction/types/types';
import { GetBatchDamageStatsDto } from './dto/get-batch-damage-stats.dto';

@Controller('batch')
@UseGuards(AuthGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  create(@Body() dto: CreateBatchDto) {
    return this.batchService.create(dto);
  }

  @Get()
  findAll(@Query() query: GetBatchesQueryDto, @Req() req: RequestWithUser) {
    return this.batchService.findAll(query, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestWithUserDocument) {
    return this.batchService.findOne(id, req.user);
  }

  @Patch(':id/mark-as-damaged')
  markDamaged(
    @Param('id') id: string,
    @Body() dto: MarkBatchDamagedDto,
    @Req() req: RequestWithUser,
  ) {
    return this.batchService.markDamaged(id, dto, req.user);
  }

  @Get('stats/damage')
  getDamageStats(
    @Query() query: GetBatchDamageStatsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.batchService.getDamageStats(query.warehouseId, req.user);
  }
}
