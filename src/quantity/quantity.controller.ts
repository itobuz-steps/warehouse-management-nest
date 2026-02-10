import { Controller, Post, Body, Put, Param, Get, Query } from '@nestjs/common';
import { QuantityService } from './quantity.service';
import { AddProductQuantityDto } from './dto/add-quantity.dto';
import { UpdateQuantityDto } from './dto/update-quantity.dto';
import { GetSpecificQuantityDto } from './dto/product-specific-quantity.dto';
import { ProductsHavingQuantityDto } from './dto/product-having-quantity.dto';
import { ProductIdParams } from './dto/product-params.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('quantity')
@ApiBearerAuth()
export class QuantityController {
  constructor(private readonly quantityService: QuantityService) {}

  @Post('product-quantity')
  async addProductQuantity(@Body() dto: AddProductQuantityDto) {
    const result = await this.quantityService.create(dto);

    return {
      message: 'Product Quantity Updated',
      success: true,
      data: result,
    };
  }

  @Put(':id/limit')
  async updateProductLimit(
    @Param('id') id: string,
    @Body() dto: UpdateQuantityDto,
  ) {
    const result = await this.quantityService.updateLimit(id, dto);

    return {
      success: true,
      message: 'Product limit updated successfully',
      data: result,
    };
  }

  @Get('product-total-quantity/:productId')
  async getTotalProductQuantity(@Param('productId') productId: string) {
    const result = await this.quantityService.getTotalQuantity(productId);
    return {
      message: 'All Product Total Quantity',
      success: true,
      data: result,
    };
  }

  @Get('specific-product-quantity')
  async getProductQuantityAcrossSpecificWarehouse(
    @Query() query: GetSpecificQuantityDto,
  ) {
    const result =
      await this.quantityService.getSpecificWarehouseQuantity(query);

    return {
      message: 'Warehouse Specific Product Quantity',
      success: true,
      data: result,
    };
  }

  @Get('all-products-having-quantity')
  async getProductsHavingQuantity(@Query() query: ProductsHavingQuantityDto) {
    const data = await this.quantityService.getProductsHavingQuantity(query);

    return {
      message: 'Products with quantity information',
      success: true,
      data,
    };
  }

  @Get('warehouse-specific-products/:warehouseId')
  async getWarehouseSpecificProducts(
    @Param('warehouseId') warehouseId: string,
  ) {
    const result = await this.quantityService.getWarehouseProducts(warehouseId);

    return {
      message: 'Specific Warehouse all products',
      success: true,
      data: result,
    };
  }

  @Get('product-specific-warehouses/:productId')
  async getProductSpecificWarehouses(@Param() params: ProductIdParams) {
    const result = await this.quantityService.findByProduct(params.productId);

    return {
      message: 'Warehouse where that specific Product is stored',
      success: true,
      data: result,
    };
  }
}
