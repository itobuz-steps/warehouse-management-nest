import { IsMongoId, IsNotEmpty } from 'class-validator';

export class TwoProductQuery {
  @IsMongoId()
  @IsNotEmpty()
  productA: string;

  @IsMongoId()
  @IsNotEmpty()
  productB: string;

  @IsMongoId()
  @IsNotEmpty()
  warehouseId: string;
}
