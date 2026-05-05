import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { Request } from 'express';
import { SubscribeDto } from './dto/subscribe.dto';
import { NotificationQueryDto } from './dto/notificationQuery.dto';

export type RequestWithUser = Request & {
  userId: string;
};

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Post('subscribe')
  subscribe(@Req() req: RequestWithUser) {
    return {
      success: true,
      message: 'Subscription saved in database.',
      timestamp: new Date().toISOString(),
      data: this.service.subscribe(req.userId, req.body as SubscribeDto),
    };
  }

  @Get()
  async getNotificationsWithQuery(
    @Req() req: RequestWithUser,
    @Query() notificationQueryDto: NotificationQueryDto,
  ) {
    return this.service.getNotifications(req.userId, notificationQueryDto);
  }

  @Put('mark-all-seen')
  async markSeen(@Req() req: RequestWithUser) {
    await this.service.markAllAsSeen(req.userId);
    return { success: true, message: 'All marked as seen' };
  }

  @Patch(':id/mark-seen')
  async markOneSeen(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.service.markOneAsSeen(id, req.userId);
    return { success: true, message: 'Notification marked as seen' };
  }
}
