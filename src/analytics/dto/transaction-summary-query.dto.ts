import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class TransactionSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;
}
