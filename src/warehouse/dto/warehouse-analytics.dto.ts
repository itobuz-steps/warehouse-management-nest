import { IsOptional, IsNumberString, IsDateString } from 'class-validator';

export class WarehouseAnalyticsQueryDto {
  @IsOptional()
  @IsNumberString()
  days?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
