import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BatchService } from './batch.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';

@Controller('batch')
@UseGuards(AuthGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post()
  create(@Body() dto: CreateBatchDto) {
    return this.batchService.create(dto);
  }

  @Get()
  findAll() {
    return this.batchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.batchService.findOne(id);
  }
}
