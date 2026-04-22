import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { LOG_ACTION } from 'src/transaction-logs/enums/log-action.enum';
import { LOG_ENTITY_TYPE } from 'src/transaction-logs/enums/log-entity-type.enum';

const toStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    if (value.includes(',')) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [value];
  }

  return undefined;
};

export class AuditLogAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(LOG_ACTION, { each: true })
  @Transform(({ value }) => toStringArray(value))
  action?: LOG_ACTION[];

  @IsOptional()
  @IsEnum(LOG_ENTITY_TYPE, { each: true })
  @Transform(({ value }) => toStringArray(value))
  entityType?: LOG_ENTITY_TYPE[];

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsIn(['day', 'week'])
  granularity?: 'day' | 'week';
}

export class AuditLogActorsQueryDto extends AuditLogAnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
