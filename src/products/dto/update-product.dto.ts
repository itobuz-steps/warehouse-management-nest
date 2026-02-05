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
} from 'class-validator';

export class updateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true, message: 'Each product image must be a valid URL' })
  @IsOptional()
  productImage?: string[];

  @IsNumber()
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  markup?: number;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
