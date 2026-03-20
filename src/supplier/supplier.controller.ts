import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';
import type { RequestWithUser } from 'src/profile/profile.controller';

@UseGuards(AuthGuard)
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get('/analytics')
  getAnalytics() {
    return this.supplierService.getAnalytics();
  }

  @Post()
  async addSupplier(
    @Body() newSupplier: CreateSupplierDto,
    @Req() req: RequestWithUser,
  ) {
    const res = await this.supplierService.create(newSupplier, req.user);

    return {
      success: true,
      message: 'supplier created successfully',
      data: res,
    };
  }

  @Put(':id')
  async updateSupplier(
    @Param('id') id: string,
    @Body() updatedSupplierData: UpdateSupplierDto,
    @Req() req: RequestWithUser,
  ) {
    const res = await this.supplierService.update(
      id,
      updatedSupplierData,
      req.user,
    );

    return {
      success: true,
      message: 'Updated Supplier successfully',
      data: res,
    };
  }

  @Delete(':id')
  async removeSupplier(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.supplierService.delete(id, req.user);

    return {
      message: 'Supplier deleted successfully',
      success: true,
    };
  }

  @Get()
  async getAll(
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '5',
  ) {
    const result = await this.supplierService.getAll(
      search,
      Number(page),
      Number(limit),
    );
    return { success: true, message: 'Suppliers Data fetched', data: result };
  }

  @Get(':id')
  async getSpecificSupplier(@Param('id') id: string) {
    return {
      message: 'Specific Supplier',
      success: true,
      data: await this.supplierService.getSpecificSupplier(id),
    };
  }
}
