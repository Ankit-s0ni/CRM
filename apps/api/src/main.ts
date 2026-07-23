import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureOpenApi } from './openapi';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configureTrustedProxies } from './shared/http/trusted-proxy';
import { validateProductionRuntimeConfiguration } from './shared/config/production-runtime-config';
import { startObservability } from './shared/observability/observability-bootstrap';
import type { Request, Response } from 'express';

type RawBodyRequest = Request & { rawBody?: Buffer };

async function bootstrap() {
  validateProductionRuntimeConfiguration();
  const observability = startObservability();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useBodyParser('json', {
    limit: '256kb',
    verify: (request: RawBodyRequest, _response: Response, buffer: Buffer) => {
      if (request.originalUrl.startsWith('/billing/webhooks/')) {
        request.rawBody = Buffer.from(buffer);
      }
    },
  });
  app.useBodyParser('urlencoded', { limit: '256kb', extended: true });
  app.useLogger(app.get(Logger));
  configureTrustedProxies(app);
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((v) => v.trim()) ?? [];
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('blufield.cloud') ||
        origin.includes('localhost')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  configureOpenApi(app);

  await app.listen(process.env.PORT ?? 4001);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await app.close();
    await observability.shutdown();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
}
void bootstrap();
