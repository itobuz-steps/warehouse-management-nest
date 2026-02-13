import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { Request } from 'express';
import { SubscribeDto } from './dto/subscribe.dto';

export interface RequestWithUser extends Request {
  userId: string;
}
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

  @Get(':offset')
  async getNotifications(
    @Req() req: RequestWithUser,
    @Param('offset') offset: string,
  ) {
    return this.service.getNotifications(req.userId, parseInt(offset || '0'));
  }

  @Put('mark-all-seen')
  async markSeen(@Req() req: RequestWithUser) {
    await this.service.markAllAsSeen(req.userId);
    return { success: true, message: 'All marked as seen' };
  }

  @Patch('change-shipment-status/:id')
  async ship(@Req() req: RequestWithUser, @Param() id: string) {
    await this.service.updateShipmentStatus(id, 'shipped', req.userId);
    return { success: true, message: 'Shipment marked shipped' };
  }

  @Patch('cancel-shipment/:id')
  async cancel(@Req() req: RequestWithUser, @Param() id: string) {
    await this.service.updateShipmentStatus(id, 'cancelled', req.userId);
    return { success: true, message: 'Shipment cancelled' };
  }
}
