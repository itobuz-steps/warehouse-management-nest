import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class GetVariantsWithStockDto {
  @IsMongoId()
  warehouseId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  variantIds: string[];
}
