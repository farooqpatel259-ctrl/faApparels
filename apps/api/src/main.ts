import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor } from './common/response-envelope.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = app.get(ConfigService);
  const port = Number(config.get<string | number>('PORT') ?? 4000);
  await app.listen(Number.isFinite(port) ? port : 4000, '0.0.0.0');
  console.log(`API listening on http://0.0.0.0:${port}/api/v1`);
}

bootstrap();
