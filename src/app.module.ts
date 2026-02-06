import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './config/db.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import configService from './config/config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configService],
    }),
    DbModule,
    AuthModule,
    WarehouseModule,
    ProductsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
