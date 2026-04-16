import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { Response } from 'express';

import { TwoProductQuery } from './dto/tow-product-query.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ProductsByStockQueryDto } from './dto/products-stock-query.dto';
import { GetWarehouseProductStockQueryDto } from './dto/warehouse-product-stock.dto';
import { DamagedBatchBySupplierQueryDto } from './dto/damaged-batch-by-supplier.dto';
import { TransactionSummaryQueryDto } from './dto/transaction-summary-query.dto';
import type { RequestWithUserDocument } from 'src/transaction/types/types';
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('product-quantities')
  async getTwoProductQuantity(@Query() query: TwoProductQuery) {
    const result =
      await this.analyticsService.getTwoProductQuantitiesData(query);

    return {
      success: true,
      message: 'Product quantities fetched successfully for the warehouse.',
      data: result,
    };
  }

  @Get('product-comparison-history')
  async getComparisonHistory(@Query() query: TwoProductQuery) {
    const result =
      await this.analyticsService.getTwoProductComparisonHistory(query);

    return {
      success: true,
      message: 'Transaction comparison history fetched successfully.',
      data: result,
    };
  }

  @Get('get-two-products-quantity-chart-data')
  async downloadExcel(@Query() query: TwoProductQuery, @Res() res: Response) {
    const buffer =
      await this.analyticsService.getTwoProductQuantitiesExcel(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=product-quantities.xlsx',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('get-two-products-transaction-chart-data')
  async downloadComparisonExcel(
    @Query() query: TwoProductQuery,
    @Res() res: Response,
  ) {
    const buffer =
      await this.analyticsService.getTwoProductComparisonHistoryExcel(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=comparison-history.xlsx',
    });

    return res.status(200).send(buffer);
  }

  @Get('products/stock')
  async getProductsByStock(@Query() query: ProductsByStockQueryDto) {
    const { order = 'desc', limit, warehouseId } = query;

    return this.analyticsService.getProductsByStock(order, limit, warehouseId);
  }

  @Get('variants/stock')
  async getVariantsByStock(@Query() query: ProductsByStockQueryDto) {
    const { order = 'desc', limit, warehouseId } = query;

    return this.analyticsService.getVariantsByStock(order, limit, warehouseId);
  }

  @Get('warehouse/products')
  async getWarehouseProductStock(
    @Query() query: GetWarehouseProductStockQueryDto,
  ) {
    const { warehouseId } = query;

    return this.analyticsService.getWarehouseProductStock(warehouseId);
  }

  @Get('top-selling')
  getTopSellingProducts(
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('limit') limit?: number,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.analyticsService.getTopSellingProducts(
      order,
      limit,
      warehouseId,
    );
  }

  @Get('top-selling/variants')
  getTopSellingVariants(
    @Query('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.analyticsService.getTopSellingVariants(productId, warehouseId);
  }

  @Get('top-stock')
  getTopStockProducts(
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('limit') limit?: number,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.analyticsService.getTopStockProducts(order, limit, warehouseId);
  }

  @Get('top-stock/variants')
  getTopStockVariants(
    @Query('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.analyticsService.getTopStockVariants(productId, warehouseId);
  }

  @Get('batches/top-volume')
  getTopBatchesByVolume(
    @Query('order') order: 'asc' | 'desc' = 'desc',
    @Query('limit') limit?: number,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.analyticsService.getTopBatchesByVolume(
      order,
      limit,
      warehouseId,
    );
  }

  @Get('batches/top-consumed')
  getTopConsumedBatches(
    @Query('limit') limit?: number,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.analyticsService.getTopConsumedBatches(limit, warehouseId);
  }

  @Get('batches/damaged-cost-by-supplier')
  getDamagedCostBySupplier(@Query() query: DamagedBatchBySupplierQueryDto) {
    return this.analyticsService.getDamagedCostBySupplier(query);
  }

  @Get('transaction-summary')
  async getTransactionSummary(
    @Query() query: TransactionSummaryQueryDto,
    @Req() req: RequestWithUserDocument,
  ) {
    const result = await this.analyticsService.getTransactionSummary(
      query,
      req.user,
    );

    return {
      success: true,
      message: 'Transaction analytics fetched successfully.',
      data: result,
    };
  }
}
