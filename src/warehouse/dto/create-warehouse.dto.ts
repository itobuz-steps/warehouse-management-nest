import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

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

  @IsNumber()
  capacity: number;
}

//strip unknown will be handled by global ValidationPipe({ whitelist: true })
