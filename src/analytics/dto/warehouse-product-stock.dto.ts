import { IsMongoId } from 'class-validator';

export class GetWarehouseProductStockQueryDto {
  @IsMongoId()
  warehouseId: string;
}
