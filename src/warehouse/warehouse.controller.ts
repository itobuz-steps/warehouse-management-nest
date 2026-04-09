import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { USER_TYPES } from 'src/auth/userType';
import { Roles } from 'src/common/guard/roles.decorator';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/profile/profile.controller';

@UseGuards(AuthGuard)
@ApiBearerAuth()
@Controller('warehouse/')
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  @Get('get-warehouses')
  getWarehouses(@Req() req: RequestWithUser) {
    return this.service.getWarehouses(req.user);
  }

  @Get('get-warehouses/:warehouseId')
  getWarehouseById(
    @Param('warehouseId') warehouseId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.getWarehouseById(warehouseId, req.user);
  }

  @Get('get-warehouse-capacity/:warehouseId')
  getWarehouseCapacity(
    @Param('warehouseId') warehouseId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.service.getWarehouseCapacity(warehouseId, req.user);
  }

  @Post()
  @Roles(USER_TYPES.ADMIN)
  addWarehouse(@Body() dto: CreateWarehouseDto, @Req() req: RequestWithUser) {
    return this.service.addWarehouse(dto, req.user);
  }

  @Put('/:id')
  @Roles(USER_TYPES.ADMIN)
  updateWarehouse(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.updateWarehouse(id, dto, req.user);
  }

  @Delete('/:id')
  @Roles(USER_TYPES.ADMIN)
  deleteWarehouse(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.deleteWarehouse(id, req.user);
  }
}
