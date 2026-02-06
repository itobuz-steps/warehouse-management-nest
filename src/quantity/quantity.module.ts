import { Module } from '@nestjs/common';
import { QuantityService } from './quantity.service';
import { QuantityController } from './quantity.controller';
import { Quantity, QuantitySchema } from './entities/quantity.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quantity.name, schema: QuantitySchema },
    ]),
  ],
  controllers: [QuantityController],
  providers: [QuantityService],
})
export class QuantityModule {}
