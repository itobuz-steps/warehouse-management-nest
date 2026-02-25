import { Controller } from '@nestjs/common';
import { VariantStockService } from './variant-stock.service';

@Controller('variant-stock')
export class VariantStockController {
  constructor(private readonly variantStockService: VariantStockService) {}
}
