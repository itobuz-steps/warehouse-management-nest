import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductItemDto } from './product-item.dto';

export class AdjustmentDto {
  @IsArray()
  @Type(() => ProductItemDto)
  products: ProductItemDto[];

  @IsMongoId()
  sourceWarehouse: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
