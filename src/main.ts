import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: '*' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Boogiepop Bootstrap API')
    .setDescription(
      'API para crear proyectos Boogiepop en GitHub desde seeds. ' +
        'Auth: header `Authorization: Bearer <BOOTSTRAP_API_KEY>`.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'BOOTSTRAP_API_KEY del servidor',
      },
      'BootstrapApiKey',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const config = app.get(ConfigService);
  const portRaw = config.get<string>('PORT', '3100');
  const port = parseInt(portRaw, 10);

  await app.listen(Number.isFinite(port) && port > 0 ? port : 3100, '0.0.0.0');
  console.log(`Bootstrap MS running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/docs`);
}

bootstrap();
