import {
  IsOptional,
  IsNumberString,
  IsBooleanString,
  IsString,
} from 'class-validator';

export class GetManagersDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsBooleanString()
  isVerified?: string;

  @IsOptional()
  @IsString()
  sort?: string;
}
