import {
  Controller,
  Get,
  // Post,
  // Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
// import { StockInDto } from './dto/stock-in.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { GetTransactionsQueryDto } from './dto/query/get-transactions.query.dto';
import { WarehouseTransactionsQueryDto } from './dto/query/warehouse-transactions.query.dto';
import type { RequestWithUserDocument } from './types/types';

@Controller('transactions')
@UseGuards(AuthGuard)
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

  // @Post('stock-in')
  // createStockIn(@Body() dto: StockInDto, @Req() req: RequestWithUserDocument) {
  //   return this.transactionService.createStockIn(dto, req.user.id);
  // }

  @Get('generate-invoice/:id')
  generateInvoice(@Param('id') id: string) {
    return this.transactionService.generateInvoice(id);
  }
}
