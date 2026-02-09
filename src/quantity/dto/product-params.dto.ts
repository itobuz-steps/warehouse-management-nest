import { IsMongoId } from 'class-validator';

export class ProductIdParams {
  @IsMongoId()
  productId: string;
}
