import { IsNumber, IsMongoId, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { Types } from 'mongoose';

export class AddProductQuantityDto {
  @IsMongoId()
  @Transform(({ value }) => new Types.ObjectId(value as string))
  productId: Types.ObjectId;

  @IsMongoId()
  @Transform(({ value }) => new Types.ObjectId(value as string))
  warehouseId: Types.ObjectId;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
