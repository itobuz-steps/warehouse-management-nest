import { IsMongoId, IsNumber, Min } from 'class-validator';

export class VariantItemDto {
  @IsMongoId()
  variantId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
