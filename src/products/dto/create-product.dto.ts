import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUrl,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import CATEGORY_TYPES from '../product.constant';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  @IsEnum(Object.values(CATEGORY_TYPES), { message: 'Invalid Category' })
  category: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUrl({}, { each: true, message: 'Each product image must be a valid URL' })
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

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Created by is required' })
  createdBy: string;
}
