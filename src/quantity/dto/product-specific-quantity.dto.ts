import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetSpecificQuantityDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsMongoId()
  @IsNotEmpty()
  warehouseId: string;
}
