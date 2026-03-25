import { IsString, IsOptional } from 'class-validator';

export class updateProductDto {
  @IsString()
  @IsOptional()
  description?: string;
}
