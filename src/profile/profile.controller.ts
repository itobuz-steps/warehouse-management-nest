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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { ProfileService } from './profile.service';
import { ManagerParamsDto } from './dto/manager-params.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('update-profile')
  @UseInterceptors(
    FileInterceptor('profile-img', {
      storage: diskStorage({
        destination: 'uploads/user',
        filename: (_, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  async updateProfile(@Req() req: Request, @UploadedFile() file: Blob) {
    return {
      success: true,
      ...(await this.profileService.updateProfile(req.user, file)),
    };
  }

  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    return {
      success: true,
      ...(await this.profileService.getCurrentUser(req.user)),
    };
  }

  @Get()
  async getUserDetails(@Req() req: Request) {
    return {
      success: true,
      ...(await this.profileService.getUserDetails(req.user)),
    };
  }

  @Delete()
  async deleteUser(@Req() req: Request) {
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
