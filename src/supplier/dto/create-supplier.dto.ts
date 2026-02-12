import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsArray,
  IsIn,
  IsPhoneNumber,
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
  @IsPhoneNumber()
  phoneNumber?: string;

  @IsArray()
  @IsIn(Object.values(PRODUCT_CATEGORY_TYPES), { each: true })
  suppliedProduct: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
