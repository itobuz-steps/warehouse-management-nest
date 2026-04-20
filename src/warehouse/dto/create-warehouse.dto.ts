import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

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

//strip unknown will be handled by global ValidationPipe({ whitelist: true })
