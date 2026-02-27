import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class GetWarehouseProductsQueryDto {
  @IsOptional()
  @IsMongoId({ message: 'The provided ID is not a valid MongoDB ObjectId' })
  warehouseId?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
