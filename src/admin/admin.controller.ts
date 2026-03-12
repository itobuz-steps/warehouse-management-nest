import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GetManagersDto } from './dto/get-manager.dto';

@Controller('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('get-managers')
  getManagers() {
    return this.adminService.getManagers();
  }

  @Get('get-all-managers')
  getAllManagers(@Query() query: GetManagersDto) {
    return this.adminService.getAllManagers(query);
  }
}
