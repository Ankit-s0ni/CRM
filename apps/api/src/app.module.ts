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

@Module({
  imports: [
    TenancyModule,
    DatabaseModule,
    IdentityModule,
    WorkspaceModule,
    AuthorizationModule,
    OutboxModule,
    OrganizationModule,
    AccessModule,
    AuditModule,
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
      .exclude({ path: 'workspace/status', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
