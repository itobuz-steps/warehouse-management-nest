import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Warehouse Management Backend')
    .setDescription(
      'A system that helps businesses track, organize, and manage inventory, orders, and warehouse operations in real time, improving accuracy, efficiency, and overall supply-chain visibility',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);
}
