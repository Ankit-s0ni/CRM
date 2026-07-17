import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureOpenApi } from './openapi';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  const trustedProxies = process.env.TRUSTED_PROXIES?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (trustedProxies?.length) app.set('trust proxy', trustedProxies);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((value) =>
      value.trim(),
    ) ?? ['http://localhost:4002'],
    credentials: true,
  });

  configureOpenApi(app);

  await app.listen(process.env.PORT ?? 4001);
}
void bootstrap();
