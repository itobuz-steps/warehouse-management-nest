import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CreateVariantDto {
  @IsMongoId()
  product: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @IsArray()
  @IsOptional()
  productImage?: string[];

  @IsNumber()
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  @IsNotEmpty({ message: 'Cost price is required' })
  price: number;

  @IsNumber()
  @Min(0, { message: 'Markup cannot be less than 0%' })
  @Max(100, { message: 'Markup cannot be more than 100%' })
  @IsOptional()
  markup?: number;
}
