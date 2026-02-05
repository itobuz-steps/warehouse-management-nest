import { Module } from '@nestjs/common';
import { QuantityService } from './quantity.service';
import { QuantityController } from './quantity.controller';

@Module({
  controllers: [QuantityController],
  providers: [QuantityService],
})
export class QuantityModule {}
