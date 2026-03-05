import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class updateProductDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'The provided ID is not a valid MongoDB ObjectId' })
  id: string;

  @IsString()
  @IsOptional()
  description?: string;
}
