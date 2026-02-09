import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import { TwoProductQuery

 } from './dto/tow-product-query.dto';
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('product-quantities')
  async getTwoProductQuantity(@Query() query:TwoProductQuery)
  {
    const result = await this.analyticsService.(query)
    return 
    {
      sucess:true,
      message: 'Product quantities fetched successfully for the warehouse.',
      data:res
    }
  }
  
  @Get('comparison-history')
  async getComparisonHistory(@Query() query: TwoProductQuery) {
    const result = await this.analyticsService.getTwoProductComparisonHistory(query);
    
    return {
      success: true,
      message: 'Transaction comparison history fetched successfully.',
      data: result,
    };
  }

  @Get('product-quantities/excel')
  async downloadExcel(
    @Query() query: TwoProductQuery, 
    @Res() res: Response
  ) {
    const buffer = await this.analyticsService.getTwoProductQuantitiesExcel(query);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=product-quantities.xlsx',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
   
  
}
