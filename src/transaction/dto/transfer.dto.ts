import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductItemDto } from './product-item.dto';

export class TransferDto {
  @IsArray()
  @Type(() => ProductItemDto)
  products: ProductItemDto[];

  @IsMongoId()
  sourceWarehouse: string;

  @IsMongoId()
  destinationWarehouse: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
