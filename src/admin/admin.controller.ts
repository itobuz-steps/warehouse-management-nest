import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
// import { USER_TYPES } from 'src/auth/userType';
// import { Roles } from 'src/common/guard/roles.decorator';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUserDocument } from 'src/transaction/types/types';

@Controller('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('get-managers')
  // @Roles(USER_TYPES.ADMIN)
  getManagers() {
    return this.adminService.getManagers();
  }

  @Get('/')
  isAdmin(@Req() req: RequestWithUserDocument) {
    return this.adminService.isAdmin(req.user);
  }
}
