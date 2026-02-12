import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

export class ProductItemDto {
  @IsMongoId()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
