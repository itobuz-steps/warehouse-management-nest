import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DbModule } from './config/db.module';
import { WarehouseModule } from './warehouse/warehouse.module';

@Module({
  imports: [ConfigModule, DbModule, WarehouseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
