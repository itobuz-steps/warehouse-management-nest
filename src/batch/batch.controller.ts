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

@Controller('batch')
@UseGuards(AuthGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  create(@Body() dto: CreateBatchDto) {
    return this.batchService.create(dto);
  }

  @Get()
  findAll(@Query() query: GetBatchesQueryDto) {
    return this.batchService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.batchService.findOne(id);
  }

  @Patch(':id/mark-as-damaged')
  markDamaged(
    @Param('id') id: string,
    @Body() dto: MarkBatchDamagedDto,
    @Req() req: RequestWithUser,
  ) {
    return this.batchService.markDamaged(id, dto, req.user);
  }
}
