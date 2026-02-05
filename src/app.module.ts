import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './config/db.module';
import { AuthModule } from './auth/auth.module';
import configService from './config/config.service';
import TokenGenerator from './utils/TokenGenerator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configService],
    }),
    DbModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, TokenGenerator],
})
export class AppModule {}
