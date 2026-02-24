import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePreferenceDto {
  @IsOptional()
  @IsBoolean()
  push: boolean;

  @IsOptional()
  @IsBoolean()
  email: boolean;
}
