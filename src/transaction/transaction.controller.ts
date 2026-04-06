import {
  Controller,
  Get,
  Post,
  Patch,
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
import { Roles } from 'src/common/guard/roles.decorator';
import { USER_TYPES } from 'src/auth/userType';

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

  @Get('single/:id')
  getTransactionById(@Param('id') id: string) {
    return this.transactionService.getTransactionById(id);
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
    return this.transactionService.createStockIn(dto, req.user);
  }

  @Post('stock-out')
  createStockOut(
    @Req() req: RequestWithUserDocument,
    @Body() dto: StockOutDto,
  ) {
    return this.transactionService.createStockOut(dto, req.user);
  }

  @Post('transfer')
  createTransfer(
    @Req() req: RequestWithUserDocument,
    @Body() dto: TransferDto,
  ) {
    return this.transactionService.createTransfer(dto, req.user);
  }

  @Post('adjustment')
  createAdjustment(
    @Req() req: RequestWithUserDocument,
    @Body() dto: AdjustmentDto,
  ) {
    return this.transactionService.createAdjustment(dto, req.user);
  }

  @Post('approve/:id')
  @Roles(USER_TYPES.ADMIN)
  approveTransaction(
    @Param('id') id: string,
    @Req() req: RequestWithUserDocument,
  ) {
    return this.transactionService.approveTransaction(id, req.user._id);
  }

  @Post('reject/:id')
  @Roles(USER_TYPES.ADMIN)
  rejectTransaction(
    @Param('id') id: string,
    @Req() req: RequestWithUserDocument,
  ) {
    return this.transactionService.rejectTransaction(id, req.user._id);
  }

  @Patch('approve-shipment/:id')
  ship(@Req() req: RequestWithUserDocument, @Param('id') id: string) {
    return this.transactionService.updateShipmentStatus(
      id,
      'shipped',
      req.user,
    );
  }

  @Patch('cancel-shipment/:id')
  cancel(@Req() req: RequestWithUserDocument, @Param('id') id: string) {
    return this.transactionService.updateShipmentStatus(
      id,
      'cancelled',
      req.user,
    );
  }

  @Get('generate-invoice/:id')
  generateInvoice(@Param('id') id: string) {
    return this.transactionService.generateInvoice(id);
  }
}
