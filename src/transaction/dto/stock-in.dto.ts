import {
  IsArray,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductItemDto } from './product-item.dto';

export class StockInDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  products: ProductItemDto[];

  @IsEmail()
  supplier: string;

  @IsMongoId()
  destinationWarehouse: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
