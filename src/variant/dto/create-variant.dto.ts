import { IsMongoId, IsObject, IsOptional } from 'class-validator';

export class CreateVariantDto {
  @IsMongoId()
  product: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;
}
