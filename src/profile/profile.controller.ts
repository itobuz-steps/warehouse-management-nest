// src/modules/profile/profile.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';

import { ProfileService } from './profile.service';
import { ManagerParamsDto } from './dto/manager-params.dto';
import { AuthGuard } from '../common/guard/auth.guard';
import { multerStorage } from 'src/helper/multer';
import { UserDocument } from 'src/auth/entities/auth.entity';

// ✅ Proper Request Type
export interface RequestWithUser extends Request {
  user: UserDocument;
}

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('update-profile')
  @UseInterceptors(
    FileInterceptor('profile-img', {
      storage: multerStorage('user'),
    }),
  )
  async updateProfile(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      success: true,
      ...(await this.profileService.updateProfile(req.user, file, req)),
    };
  }

  @Get('me')
  getCurrentUser(@Req() req: RequestWithUser) {
    return {
      success: true,
      ...this.profileService.getCurrentUser(req.user),
    };
  }

  @Get()
  async getUserDetails(@Req() req: RequestWithUser) {
    return {
      success: true,
      ...(await this.profileService.getUserDetails(req.user)),
    };
  }

  @Delete()
  async deleteUser(@Req() req: RequestWithUser) {
    return {
      success: true,
      ...(await this.profileService.deleteUser(req.user)),
    };
  }

  @Patch('change-user-status/:managerId')
  async changeStatus(@Param() params: ManagerParamsDto) {
    return {
      success: true,
      ...(await this.profileService.changeStatus(params.managerId)),
    };
  }
}
