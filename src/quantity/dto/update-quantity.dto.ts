import { PartialType } from '@nestjs/mapped-types';
import { AddProductQuantityDto } from './add-quantity.dto';

export class UpdateQuantityDto extends PartialType(AddProductQuantityDto) {}
