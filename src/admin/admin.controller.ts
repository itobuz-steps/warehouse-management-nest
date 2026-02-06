import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AddWarehouseDto } from './dto/add-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { USER_TYPES } from 'src/auth/userType';
import { Roles } from 'src/common/guard/roles.decorator';

@Controller('admin')
@Roles(USER_TYPES.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('warehouses')
  addWarehouse(@Body() dto: AddWarehouseDto) {
    return this.adminService.addWarehouse(dto);
  }

  @Patch('warehouses/:id')
  updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.adminService.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  removeWarehouse(@Param('id') id: string) {
    return this.adminService.removeWarehouse(id);
  }

  @Get('get-managers')
  getManagers() {
    return this.adminService.getManagers();
  }
}
