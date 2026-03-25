import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsIn,
  Matches,
  Length,
} from 'class-validator';

import { PRODUCT_CATEGORY_TYPES } from 'src/products/constants/product.constant';

export class CreateSupplierDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Matches(/^[0-9]+$/, { message: 'Phone number must contain only digits' })
  @Length(10, 10, { message: 'Phone number must be exactly 10 digits' })
  phoneNumber?: string;

  @IsArray()
  @IsIn(Object.values(PRODUCT_CATEGORY_TYPES), { each: true })
  suppliedProduct: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
