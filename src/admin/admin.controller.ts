import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GetManagersDto } from './dto/get-manager.dto';

@Controller('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('get-managers')
  getManagers(@Query('warehouseId') warehouseId?: string) {
    return this.adminService.getManagers(warehouseId);
  }

  @Get('get-all-managers')
  getAllManagers(@Query() query: GetManagersDto) {
    return this.adminService.getAllManagers(query);
  }

  @Get('analytics')
  @ApiQuery({ name: 'managerId', required: false, type: String })
  @ApiQuery({ name: 'warehouseId', required: false, type: String })
  getManagerAnalytics(
    @Query('managerId') managerId?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.adminService.getManagerTransactionStats(managerId, warehouseId);
  }

  @Get('manager-trend')
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['7', '30'],
    description: 'Last 7 days or 30 days',
  })
  getManagerTrend(@Query('period') period?: string) {
    const days = period === '30' ? 30 : 7;
    return this.adminService.getManagerAddedTrend(days);
  }
}
