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
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';

import { ProfileService } from './profile.service';
import { ManagerParamsDto } from './dto/manager-params.dto';
import { AuthGuard } from '../common/guard/auth.guard';
import { multerStorage } from 'src/helper/multer';
import { UserDocument } from 'src/auth/entities/auth.entity';
import { FILE_FIELD } from 'src/common/constants/file.constant';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

export interface RequestWithUser extends Request {
  user: UserDocument;
}

@Controller('profile')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('update-profile')
  @UseInterceptors(
    FileInterceptor(FILE_FIELD.profileImage, {
      storage: multerStorage(),
    }),
  )
  async updateProfile(
    @Req() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return {
      success: true,
      ...(await this.profileService.updateProfile(req.user, file)),
    };
  }

  @Get('me')
  async getCurrentUser(@Req() req: RequestWithUser) {
    const userData = await this.profileService.getCurrentUser(req.user);

    return {
      success: true,
      user: userData,
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
  async changeStatus(
    @Param() params: ManagerParamsDto,
    @Req() req: RequestWithUser,
  ) {
    return {
      success: true,
      ...(await this.profileService.changeStatus(params.managerId, req.user)),
    };
  }

  @Patch('update-preference')
  async updateNotificationPreferece(
    @Body() pref: UpdatePreferenceDto,
    @Req() req: RequestWithUser,
  ) {
    const res = await this.profileService.setUserNotificationPreference(
      pref,
      req.user,
    );

    return {
      success: true,
      message: 'updated successfully',
      data: res,
    };
  }
}
