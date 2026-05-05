import { IsMongoId, IsOptional } from 'class-validator';

export class GetBatchDamageStatsDto {
  @IsOptional()
  @IsMongoId()
  warehouseId?: string;
}
