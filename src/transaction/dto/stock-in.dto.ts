import {
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class StockInProductDto {
  @IsMongoId()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class StockInDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockInProductDto)
  products: StockInProductDto[];

  @IsString()
  supplier: string;

  @IsMongoId()
  destinationWarehouse: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
