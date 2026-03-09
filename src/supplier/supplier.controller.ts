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
import { Roles } from 'src/common/guard/roles.decorator';
import { USER_TYPES } from 'src/auth/userType';
import type { RequestWithUser } from 'src/profile/profile.controller';

@UseGuards(AuthGuard)
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

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

  @Roles(USER_TYPES.ADMIN)
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

  @Roles(USER_TYPES.ADMIN)
  @Delete(':id')
  async removeSupplier(@Param('id') id: string, @Req() req: RequestWithUser) {
    await this.supplierService.delete(id, req.user);

    return {
      message: 'Supplier deleted successfully',
      success: true,
    };
  }

  @Get()
  async getAllSupplier(@Query('search') search?: string) {
    const res = await this.supplierService.getAll(search);

    return {
      success: true,
      message: 'Obtained Supplier Data Successfully',
      data: res,
    };
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
