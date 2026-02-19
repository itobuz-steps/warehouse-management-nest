import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

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
  phoneNumber?: string;
}
