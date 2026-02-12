import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { StockInDto } from './dto/stock-in.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { GetTransactionsQueryDto } from './dto/query/get-transactions.query.dto';
import { WarehouseTransactionsQueryDto } from './dto/query/warehouse-transactions.query.dto';
import type { RequestWithUserDocument } from './types/types';
import { StockOutDto } from './dto/stock-out.dto';
import { TransferDto } from './dto/transfer.dto';
import { AdjustmentDto } from './dto/adjustment.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('transaction')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  getTransactions(
    @Query() query: GetTransactionsQueryDto,
    @Req() req: RequestWithUserDocument,
  ) {
    return this.transactionService.getTransactions(query, req.user);
  }

  @Get('/:warehouseId')
  getWarehouseTransactions(
    @Param('warehouseId') warehouseId: string,
    @Query() query: WarehouseTransactionsQueryDto,
  ) {
    return this.transactionService.getWarehouseTransactions(warehouseId, query);
  }

  @Post('stock-in')
  createStockIn(@Req() req: RequestWithUserDocument, @Body() dto: StockInDto) {
    return this.transactionService.createStockIn(dto, req.user.id);
  }

  @Post('stock-out')
  createStockOut(
    @Req() req: RequestWithUserDocument,
    @Body() dto: StockOutDto,
  ) {
    return this.transactionService.createStockOut(dto, req.user.id);
  }

  @Post('transfer')
  createTransfer(
    @Req() req: RequestWithUserDocument,
    @Body() dto: TransferDto,
  ) {
    return this.transactionService.createTransfer(dto, req.user.id);
  }

  @Post('adjustment')
  createAdjustment(
    @Req() req: RequestWithUserDocument,
    @Body() dto: AdjustmentDto,
  ) {
    return this.transactionService.createAdjustment(dto, req.user.id);
  }

  @Get('generate-invoice/:id')
  generateInvoice(@Param('id') id: string) {
    return this.transactionService.generateInvoice(id);
  }
}
