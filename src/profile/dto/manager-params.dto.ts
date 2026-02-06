// src/modules/profile/dto/manager-params.dto.ts
import { IsMongoId } from 'class-validator';

export class ManagerParamsDto {
  @IsMongoId()
  managerId: string;
}
