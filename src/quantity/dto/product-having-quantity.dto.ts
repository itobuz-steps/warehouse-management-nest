// dto/products-having-quantity.dto.ts
import {
  IsOptional,
  IsString,
  IsNumber,
  IsMongoId,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductsHavingQuantityDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  sort?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = 10;
}
