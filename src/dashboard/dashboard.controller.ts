import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('get-inventory-category/:warehouseId')
  getInventoryByCategory(@Param('warehouseId') id: string) {
    return this.service.getInventoryByCategory(id);
  }

  @Get('get-inventory-category-chart-data/:warehouseId')
  async exportInventoryCategoryExcel(
    @Param('warehouseId') warehouseId: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.service.generateInventoryByCategoryExcel(warehouseId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=top-products.xlsx',
    });

    return res.status(200).send(buffer);
  }

  @Get('get-product-transaction/:warehouseId')
  getProductTransaction(@Param('warehouseId') id: string) {
    return this.service.getProductTransaction(id);
  }

  @Get('get-product-transaction-chart-data/:warehouseId')
  async exportTransactionExcel(
    @Param('warehouseId') warehouseId: string,
    @Res() res: Response,
  ) {
    const buffer =
      await this.service.generateProductTransactionExcel(warehouseId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=top-products.xlsx',
    });

    return res.status(200).send(buffer);
  }

  @Get('get-transaction-stats/:warehouseId')
  getTransactionStats(@Param('warehouseId') id: string) {
    return this.service.getTransactionStats(id);
  }

  @Get('get-low-stock-products/:warehouseId')
  getLowStockProducts(@Param('warehouseId') id: string) {
    return this.service.getLowStockProducts(id);
  }

  @Get('get-top-selling-products/:warehouseId')
  getTopSellingProducts(
    @Param('warehouseId') id: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getTopSellingProducts(id, limit);
  }

  @Get('get-cancelled-orders/:warehouseId')
  getCancelledProducts(
    @Param('warehouseId') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMostCancelledProducts(id, {
      startDate,
      endDate,
      limit: limit ? Number(limit) : 5,
    });
  }

  @Get('get-most-adjusted-products/:warehouseId')
  getMostAdjustedProducts(
    @Param('warehouseId') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMostAdjustedProducts(id, {
      limit: limit ? Number(limit) : 5,
    });
  }

  @Get('get-profit-loss')
  getProfitLoss(
    @Query('period') period?: string,
    @Query('warehouseId') id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getProfitLoss({
      period,
      id,
      from,
      to,
    });
  }

  @Get('get-top-products/:warehouseId')
  async getTopFiveProducts(@Param('warehouseId') warehouseId: string) {
    const data = await this.service.getTopFiveProducts(warehouseId);

    return {
      message: 'Data fetched successfully',
      success: true,
      data,
    };
  }

  @Get('get-top-products-chart-data/:warehouseId')
  async generateTopFiveProductsExcel(
    @Param('warehouseId') warehouseId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateTopFiveProductsExcel(warehouseId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=top-products.xlsx',
    });

    return res.status(200).send(buffer);
  }
}
