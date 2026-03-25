import { IsIn, IsMongoId, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductsByStockQueryDto {
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;
}
