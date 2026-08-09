import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { TenantMiddleware } from '../../platform/tenancy/http';
import { TenancyModule } from '../../platform/tenancy/public';
import { AuthorizationModule } from '../authorization/authorization.module';
import { DatabaseModule } from '../database/database.module';
import { OutboxModule } from '../events/outbox.module';
import { HealthModule } from '../health/health.module';
import { ApiExceptionFilter } from '../http/api-exception.filter';
import { RequestIdMiddleware } from '../http/request-id.middleware';
import { createValidationPipe } from '../http/validation';
import { ObservabilityModule } from '../observability/observability.module';

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.token',
            'req.body.attestationToken',
            'req.body.livenessProofToken',
            'req.body.selfieKey',
            'req.body.privateObjectKey',
            'req.body.pushToken',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        customProps: (request) => ({
          requestId: request.headers['x-request-id'],
          tenantId: request.headers['x-tenant-id'],
        }),
      },
    }),
    ObservabilityModule,
    TenancyModule,
    DatabaseModule,
    AuthorizationModule,
    OutboxModule,
    HealthModule,
  ],
  providers: [
    RequestIdMiddleware,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
  exports: [
    LoggerModule,
    ObservabilityModule,
    TenancyModule,
    DatabaseModule,
    AuthorizationModule,
    OutboxModule,
    HealthModule,
  ],
})
export class ApiFoundationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'workspace/status', method: RequestMethod.GET },
        { path: 'healthz', method: RequestMethod.GET },
        { path: 'readyz', method: RequestMethod.GET },
        { path: 'api/docs', method: RequestMethod.ALL },
        { path: 'platform/*path', method: RequestMethod.ALL },
        { path: '.well-known/*path', method: RequestMethod.ALL },
        { path: 'internal/v1/*path', method: RequestMethod.ALL },
        { path: 'billing/webhooks/*path', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
