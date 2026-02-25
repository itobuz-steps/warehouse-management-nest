import { IsMongoId, ValidateNested } from 'class-validator';
import { VariantItemDto } from './variant-item.dto';
import { Type } from 'class-transformer';

export class ProductItemDto {
  @IsMongoId()
  productId: string;

  @ValidateNested({ each: true })
  @Type(() => VariantItemDto)
  variants: VariantItemDto[];
}
