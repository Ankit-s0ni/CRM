import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { PlatformWorkerModule } from './platform-worker.module';
import { validateProductionRuntimeConfiguration } from './shared/config/production-runtime-config';
import { startObservability } from './shared/observability/observability-bootstrap';

async function bootstrap() {
  validateProductionRuntimeConfiguration();
  const observability = startObservability();
  const app = await NestFactory.createApplicationContext(PlatformWorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  Logger.log('Platform background worker started', 'PlatformWorkerBootstrap');

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
