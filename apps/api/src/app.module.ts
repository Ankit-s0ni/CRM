import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './shared/database/database.module';
import { TenancyModule } from './platform/tenancy/public';
import { TenantMiddleware } from './platform/tenancy/http';
import { IdentityModule } from './platform/identity/public';
import { AuthorizationModule } from './shared/authorization/authorization.module';
import { WorkspaceProductModule } from './platform/workspace/public';
import { ApiExceptionFilter } from './shared/http/api-exception.filter';
import { RequestIdMiddleware } from './shared/http/request-id.middleware';
import { createValidationPipe } from './shared/http/validation';
import { OutboxModule } from './shared/events/outbox.module';
import { OrganizationModule } from './platform/organization/public';
import { AccessModule } from './platform/access/public';
import { AuditModule } from './platform/audit/public';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './shared/health/health.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { NotificationsModule } from './platform/notifications/public';
import { BillingModule } from './platform/billing/public';
import { AttendanceProductModule } from './products/attendance/public';
import { PlatformControlPlaneModule } from './platform/control-plane/public';

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
    IdentityModule,
    WorkspaceProductModule,
    AuthorizationModule,
    OutboxModule,
    OrganizationModule,
    AccessModule,
    AuditModule,
    HealthModule,
    PlatformControlPlaneModule,
    AttendanceProductModule,
    NotificationsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RequestIdMiddleware,
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class AppModule implements NestModule {
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
        { path: 'billing/webhooks/*path', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
