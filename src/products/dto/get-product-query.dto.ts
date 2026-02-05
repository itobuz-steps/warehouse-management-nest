// src/products/dto/get-products-query.dto.ts
import { IsOptional, IsString, IsIn, IsNumberString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetProductsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['name_asc', 'name_desc', 'category_asc', 'newest'])
  sort?: 'name_asc' | 'name_desc' | 'category_asc' | 'newest';

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => (value as string) || '1')
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => (value as string) || '10')
  limit?: string = '10';
}
