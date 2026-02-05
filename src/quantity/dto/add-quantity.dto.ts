// dto/add-product-quantity.dto.ts
import { IsNumber, IsMongoId, IsOptional, Min } from 'class-validator';

export class AddProductQuantityDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  warehouseId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
