import { IsOptional, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { LOG_ACTION } from '../enums/log-action.enum';
import { LOG_ENTITY_TYPE } from '../enums/log-entity-type.enum';

export class GetLogsDto {
  @IsOptional()
  @IsEnum(LOG_ACTION)
  action?: LOG_ACTION;

  @IsOptional()
  @IsEnum(LOG_ENTITY_TYPE)
  entityType?: LOG_ENTITY_TYPE;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;
}
