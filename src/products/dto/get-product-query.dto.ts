import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { SORT_CATEGORY } from '../constants/product.constant';
import { Transform } from 'class-transformer';

export class GetProductsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SORT_CATEGORY)
  sort?: SORT_CATEGORY;

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => (value as string) || '1')
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  @Transform(({ value }) => (value as string) || '10')
  limit?: string = '10';
}
