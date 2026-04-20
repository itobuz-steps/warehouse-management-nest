import { PartialType } from '@nestjs/mapped-types';
import { CreateWarehouseDto } from './create-warehouse.dto';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  @IsArray()
  @IsOptional()
  managers?: string[];

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  capacity: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  maxTransactionPriceLimit: number;
}
