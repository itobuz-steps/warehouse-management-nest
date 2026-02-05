import { IsNumber, Min } from 'class-validator';

export class UpdateProductLimitDto {
  @IsNumber()
  @Min(1, { message: 'Limit must be greater than zero' })
  limit: number;
}
