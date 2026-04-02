import {
  IsOptional,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SortBy,
  SortOrder,
  TRANSACTION_TYPES,
} from 'src/transaction/constants/transactionConstants';
import { SHIPMENT_TYPES } from 'src/transaction/constants/shipmentConstants';
import { TRANSACTION_STATUS } from 'src/transaction/constants/transactionStatus';

export class GetTransactionsQueryDto {
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
  @IsString()
  reportId?: string;

  @IsOptional()
  @IsString()
  performedBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

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
