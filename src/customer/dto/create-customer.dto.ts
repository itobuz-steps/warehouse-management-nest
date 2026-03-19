import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  Length,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name?: string;

  @IsEmail()
  @IsNotEmpty({ message: 'Email is required' })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address?: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^[0-9]+$/, { message: 'Phone number must contain only digits' })
  @Length(10, 10, { message: 'Phone number must be exactly 10 digits' })
  phoneNumber: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
