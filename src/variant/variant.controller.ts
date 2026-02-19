import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';

@Controller('variant')
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Post()
  create(@Body() dto: CreateVariantDto) {
    return this.variantService.create(dto);
  }

  @Get('product/:id')
  findByProduct(@Param('id') id: string) {
    return this.variantService.findByProduct(id);
  }
}
