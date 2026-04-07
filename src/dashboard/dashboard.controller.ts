import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('get-inventory-category')
  getInventoryByCategory(@Query('warehouseId') id?: string) {
    return this.service.getInventoryByCategory(id);
  }

  @Get('get-inventory-category-chart-data')
  async exportInventoryCategoryExcel(
    @Query('warehouseId') warehouseId: string,
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

  @Get('get-product-transaction')
  getProductTransaction(@Query('warehouseId') id?: string) {
    return this.service.getProductTransaction(id);
  }

  @Get('get-product-transaction-chart-data')
  async exportTransactionExcel(
    @Query('warehouseId') warehouseId: string,
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

  @Get('get-transaction-stats')
  getTransactionStats(@Query('warehouseId') id?: string) {
    return this.service.getTransactionStats(id);
  }

  @Get('get-low-stock-products')
  getLowStockProducts(@Query('warehouseId') id?: string) {
    return this.service.getLowStockProducts(id);
  }

  @Get('get-top-selling-products')
  getTopSellingProducts(
    @Query('warehouseId') id?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getTopSellingProducts(id, limit);
  }

  @Get('get-cancelled-orders')
  getCancelledProducts(
    @Query('warehouseId') id?: string,
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

  @Get('get-most-adjusted-products')
  getMostAdjustedProducts(
    @Query('warehouseId') id?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMostAdjustedProducts(id, {
      limit: limit ? Number(limit) : 5,
    });
  }

  @Get('get-profit-loss')
  getProfitLoss(
    @Query('period') period?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getProfitLoss({
      period,
      id: warehouseId,
      from,
      to,
    });
  }

  @Get('get-top-products')
  async getTopFiveProducts(@Query('warehouseId') warehouseId?: string) {
    const data = await this.service.getTopFiveProducts(warehouseId);

    return {
      message: 'Data fetched successfully',
      success: true,
      data,
    };
  }

  @Get('get-top-products-chart-data')
  async generateTopFiveProductsExcel(
    @Query('warehouseId') warehouseId: string,
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
