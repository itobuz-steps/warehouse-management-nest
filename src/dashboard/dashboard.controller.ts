import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUserDocument } from 'src/transaction/types/types';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('get-inventory-category')
  getInventoryByCategory(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') id?: string,
  ) {
    return this.service.getInventoryByCategory(id, req.user);
  }

  @Get('get-inventory-category-chart-data')
  async exportInventoryCategoryExcel(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') warehouseId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateInventoryByCategoryExcel(
      warehouseId,
      req.user,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=top-products.xlsx',
    });

    return res.status(200).send(buffer);
  }

  @Get('get-product-transaction')
  getProductTransaction(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') id?: string,
  ) {
    return this.service.getProductTransaction(id, req.user);
  }

  @Get('get-product-transaction-chart-data')
  async exportTransactionExcel(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') warehouseId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateProductTransactionExcel(
      warehouseId,
      req.user,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=top-products.xlsx',
    });

    return res.status(200).send(buffer);
  }

  @Get('get-transaction-stats')
  getTransactionStats(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') id?: string,
  ) {
    return this.service.getTransactionStats(id, req.user);
  }

  @Get('get-low-stock-products')
  getLowStockProducts(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') id?: string,
  ) {
    return this.service.getLowStockProducts(id, req.user);
  }

  @Get('get-top-selling-products')
  getTopSellingProducts(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') id?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getTopSellingProducts(id, limit, req.user);
  }

  @Get('get-cancelled-orders')
  getCancelledProducts(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') id?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMostCancelledProducts(
      id,
      {
        startDate,
        endDate,
        limit: limit ? Number(limit) : 5,
      },
      req.user,
    );
  }

  @Get('get-most-adjusted-products')
  getMostAdjustedProducts(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') id?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getMostAdjustedProducts(
      id,
      {
        limit: limit ? Number(limit) : 5,
      },
      req.user,
    );
  }

  @Get('get-profit-loss')
  getProfitLoss(
    @Req() req: RequestWithUserDocument,
    @Query('period') period?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getProfitLoss(
      {
        period,
        id: warehouseId,
        from,
        to,
      },
      req.user,
    );
  }

  @Get('get-top-products')
  async getTopFiveProducts(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') warehouseId?: string,
  ) {
    const data = await this.service.getTopFiveProducts(warehouseId, req.user);

    return {
      message: 'Data fetched successfully',
      success: true,
      data,
    };
  }

  @Get('get-top-products-chart-data')
  async generateTopFiveProductsExcel(
    @Req() req: RequestWithUserDocument,
    @Query('warehouseId') warehouseId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateTopFiveProductsExcel(
      warehouseId,
      req.user,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=top-products.xlsx',
    });

    return res.status(200).send(buffer);
  }
}
