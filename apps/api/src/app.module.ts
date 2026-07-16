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
import { TenancyModule } from './shared/tenancy/tenancy.module';
import { TenantMiddleware } from './shared/tenancy/tenant.middleware';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthorizationModule } from './shared/authorization/authorization.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ApiExceptionFilter } from './shared/http/api-exception.filter';
import { RequestIdMiddleware } from './shared/http/request-id.middleware';
import { createValidationPipe } from './shared/http/validation';
import { OutboxModule } from './shared/events/outbox.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { AccessModule } from './modules/access/access.module';
import { AuditModule } from './shared/audit/audit.module';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './shared/health/health.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { PlatformAuthModule } from './modules/platform/platform-auth/platform-auth.module';
import { PlatformTenantsModule } from './modules/platform/tenants/platform-tenants.module';
import { PlatformModulesModule } from './modules/platform/modules/platform-modules.module';
import { ImpersonationModule } from './modules/platform/impersonation/impersonation.module';
import { PlatformOperationsModule } from './modules/platform/operations/platform-operations.module';

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
    WorkspaceModule,
    AuthorizationModule,
    OutboxModule,
    OrganizationModule,
    AccessModule,
    AuditModule,
    HealthModule,
    PlatformAuthModule,
    PlatformTenantsModule,
    PlatformModulesModule,
    ImpersonationModule,
    PlatformOperationsModule,
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
      )
      .forRoutes('*');
  }
}
