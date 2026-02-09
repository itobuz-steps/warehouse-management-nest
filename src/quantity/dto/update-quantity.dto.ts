import { Min, IsNumber } from 'class-validator';

export class UpdateQuantityDto {
  @IsNumber()
  @Min(0)
  limit: number;
}
