import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { AuthGuard } from 'src/common/guard/auth.guard';

@Controller('variant')
@UseGuards(AuthGuard)
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
