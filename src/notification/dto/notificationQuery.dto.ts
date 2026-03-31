import { IsOptional } from 'class-validator';
import { NOTIFICATION_TYPES } from '../notificationTypes';

export class NotificationQueryDto {
  @IsOptional()
  offset?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  unread?: boolean;

  @IsOptional()
  type?: NOTIFICATION_TYPES;
}
