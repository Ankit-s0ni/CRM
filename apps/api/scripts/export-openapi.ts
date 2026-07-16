import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/openapi';

async function exportOpenApi() {
  process.env.IMPORT_QUEUE_MODE = 'inline';
  process.env.IMPORT_STORAGE_MODE = 'memory';
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const document = createOpenApiDocument(app);
  writeFileSync(
    resolve(process.cwd(), '../../docs/openapi.json'),
    `${JSON.stringify(document, null, 2)}\n`,
  );
  await app.close();
}

void exportOpenApi();
