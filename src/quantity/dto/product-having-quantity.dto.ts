import {
  IsOptional,
  IsString,
  IsNumber,
  IsMongoId,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import configService from 'src/config/config.service';

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
  page: number = Number(configService().PAGE);

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = Number(configService().LIMIT);
}
