import { Module } from '@nestjs/common';
import { QuantityService } from './quantity.service';
import { QuantityController } from './quantity.controller';
import { Quantity, QuantitySchema } from './entities/quantity.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from 'src/config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quantity.name, schema: QuantitySchema },
    ]),
    ConfigModule,
  ],
  controllers: [QuantityController],
  providers: [QuantityService],
})
export class QuantityModule {}
