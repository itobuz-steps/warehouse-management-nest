import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const tokenExpiry = configService.get<string>('TOKEN_EXPIRE');
  console.log(tokenExpiry);

  app.enableCors();

  await app.listen(process.env.PORT ?? 3030);
}
bootstrap();
