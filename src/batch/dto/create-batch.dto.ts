import {
  IsMongoId,
  IsNumber,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBatchItemDto {
  @IsMongoId()
  variant: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CreateBatchDto {
  @IsOptional()
  @IsMongoId()
  sourceWarehouse?: string;

  @IsOptional()
  @IsMongoId()
  destinationWarehouse?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBatchItemDto)
  items: CreateBatchItemDto[];
}
