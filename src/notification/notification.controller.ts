import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from 'src/common/guard/auth.guard';
import { Request } from 'express';
import { SubscribeDto } from './dto/subscribe.dto';
import { ShipmentParamsDto } from './dto/notification.dto';

export interface RequestWithUser extends Request {
  userId: string;
}

@Controller('notification')
@UseGuards(AuthGuard)
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

  @Put('change-shipment-status/:id')
  async ship(@Req() req: RequestWithUser, @Param() params: ShipmentParamsDto) {
    await this.service.updateShipmentStatus(params.id, 'shipped', req.userId);
    return { success: true, message: 'Shipment marked shipped' };
  }

  @Put('cancel-shipment/:id')
  async cancel(
    @Req() req: RequestWithUser,
    @Param() params: ShipmentParamsDto,
  ) {
    await this.service.updateShipmentStatus(params.id, 'cancelled', req.userId);
    return { success: true, message: 'Shipment cancelled' };
  }
}
