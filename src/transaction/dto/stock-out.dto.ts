import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductItemDto } from './product-item.dto';

export class StockOutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  products: ProductItemDto[];

  @IsMongoId()
  customer?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsMongoId()
  sourceWarehouse: string;
}
