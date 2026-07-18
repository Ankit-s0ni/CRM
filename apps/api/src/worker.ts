import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { Logger as PinoLogger } from 'nestjs-pino';
import { validateProductionRuntimeConfiguration } from './shared/config/production-runtime-config';
import { startObservability } from './shared/observability/observability-bootstrap';

async function bootstrap() {
  validateProductionRuntimeConfiguration();
  const observability = startObservability();
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  Logger.log('Background worker started', 'WorkerBootstrap');

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
