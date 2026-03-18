import { IsOptional, IsIn, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TRANSACTION_TYPES } from 'src/transaction/constants/transactionConstants';
import { SHIPMENT_TYPES } from 'src/transaction/constants/shipmentConstants';
import { TRANSACTION_STATUS } from 'src/transaction/constants/transactionStatus';
export class WarehouseTransactionsQueryDto {
  @IsOptional()
  @IsIn([...Object.values(TRANSACTION_TYPES), 'ALL'])
  type?: TRANSACTION_TYPES | 'ALL';

  @IsOptional()
  @IsIn([...Object.values(SHIPMENT_TYPES), 'ALL'])
  status?: SHIPMENT_TYPES | 'ALL';

  @IsOptional()
  @IsIn([...Object.values(TRANSACTION_STATUS), 'ALL'])
  approvalStatus?: TRANSACTION_STATUS | 'ALL';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
