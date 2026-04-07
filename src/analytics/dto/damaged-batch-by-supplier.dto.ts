import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class DamagedBatchBySupplierQueryDto {
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
