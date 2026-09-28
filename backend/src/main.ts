import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { AppModule } from './app.module';
import { uploadsRoot } from './common/upload';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configuredOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAllOrigins =
    !configuredOrigins?.length || configuredOrigins.includes('*');

  app.enableCors({
    // Mobile apps do not send Origin; allow all when unset or CORS_ORIGINS=*
    origin: allowAllOrigins ? true : configuredOrigins,
    credentials: true,
  });

  const uploadDir = uploadsRoot();
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
