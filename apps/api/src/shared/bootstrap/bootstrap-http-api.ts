import type { Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { configureOpenApi } from '../../openapi';
import { validateProductionRuntimeConfiguration } from '../config/production-runtime-config';
import { isTrustedApplicationOrigin } from '../http/cors-origin';
import { csrfProtection } from '../http/csrf.middleware';
import { configureTrustedProxies } from '../http/trusted-proxy';
import { startObservability } from '../observability/observability-bootstrap';

type RawBodyRequest = Request & { rawBody?: Buffer };

type HttpApiBootstrapOptions = {
  serviceName: string;
  port: string | number;
};

export async function bootstrapHttpApi(
  rootModule: Type<unknown>,
  options: HttpApiBootstrapOptions,
) {
  validateProductionRuntimeConfiguration();
  const observability = startObservability();
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
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
  app.use(csrfProtection);
  app.useLogger(app.get(Logger));
  configureTrustedProxies(app);
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins =
        process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) ?? [];
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        isTrustedApplicationOrigin(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Origin is not allowed by CORS'), false);
      }
    },
    credentials: true,
    exposedHeaders: ['x-csrf-token', 'x-request-id'],
  });

  configureOpenApi(app);
  await app.listen(options.port);
  app
    .get(Logger)
    .log(`${options.serviceName} listening on port ${String(options.port)}`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await app.close();
    await observability.shutdown();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());

  return app;
}
