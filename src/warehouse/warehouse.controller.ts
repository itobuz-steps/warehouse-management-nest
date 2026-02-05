import { Controller, Get, Param, Req } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import User from './types/userType';

@Controller()
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  @Get('get-warehouses')
  getWarehouses(@Req() req: Request & User) {
    const user = {
      _id: 'TEMP_USER_ID',
      role: 'ADMIN', // or MANAGER
      name: 'Temp User',
      email: 'temp@test.com',
    };

    return this.service.getWarehouses(user); // req.user
  }

  @Get('get-warehouses/:warehouseId')
  getWarehouseById(
    @Param('warehouseId') warehouseId: string,
    // @Req() req: Request,
  ) {
    const user = {
      _id: 'TEMP_USER_ID',
      role: 'ADMIN',
    };

    return this.service.getWarehouseById(warehouseId, user); // req.user
  }

  @Get('get-warehouse-capacity/:warehouseId')
  getWarehouseCapacity(
    @Param('warehouseId') warehouseId: string,
    // @Req() req: Request,
  ) {
    const user = {
      _id: 'TEMP_USER_ID',
      role: 'ADMIN',
    };
    return this.service.getWarehouseCapacity(warehouseId, user); // req.user
  }
}
