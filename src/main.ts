import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './utils/setupSwager';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3030);
}
bootstrap();
