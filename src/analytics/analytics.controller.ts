import { Controller, Get, Query, Res } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { Response } from 'express';

import { TwoProductQuery } from './dto/tow-product-query.dto';
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
}
