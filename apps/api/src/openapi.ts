import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('Tenant-isolated CRM and attendance platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'x-tenant-id' },
      'tenant-id',
    )
    .build();
  return SwaggerModule.createDocument(app, config);
}

export function configureOpenApi(app: INestApplication) {
  SwaggerModule.setup('api/docs', app, createOpenApiDocument(app));
}
