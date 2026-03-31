import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumberString,
  IsMongoId,
} from 'class-validator';
import { SORT_CATEGORY } from '../constants/product.constant';
import { Transform } from 'class-transformer';

export class GetProductsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId({ message: 'The provided ID is not a valid MongoDB ObjectId' })
  warehouseId?: string;

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ obj }: { obj: { category: string[] } }) => {
    const raw = obj.category ?? obj['category[]'];

    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
  })
  category?: string[];

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
