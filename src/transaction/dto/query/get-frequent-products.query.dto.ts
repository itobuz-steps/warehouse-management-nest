import { IsEnum, IsMongoId } from 'class-validator';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';

export class GetFrequentProductsDto {
  @IsMongoId()
  warehouseId: string;

  @IsEnum(TRANSACTION_TYPES)
  type: TRANSACTION_TYPES;
}
