import { IsInt, IsMongoId, IsOptional, Min, ValidateIf } from 'class-validator';

export class MarkBatchDamagedDto {
  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @ValidateIf((o: MarkBatchDamagedDto) => o.quantity !== undefined)
  @IsInt()
  @Min(1)
  quantity?: number;
}
