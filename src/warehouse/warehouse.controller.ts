import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import User from './types/userType';
import type { Request } from 'express';
import { AuthGuard } from 'src/common/guard/auth.guard';

export interface RequestWithUser extends Request {
  user: User;
}

@UseGuards(AuthGuard)
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
}
