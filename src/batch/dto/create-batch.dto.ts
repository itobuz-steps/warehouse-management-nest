import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';

export class CreateBatchItemDto {
  @IsMongoId()
  variant: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateBatchDto {
  @IsEnum(TRANSACTION_TYPES)
  transactionType: TRANSACTION_TYPES;

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
