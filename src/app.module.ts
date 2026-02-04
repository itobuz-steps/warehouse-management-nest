import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DbModule } from './config/db.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [ConfigModule, DbModule, ProductsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
