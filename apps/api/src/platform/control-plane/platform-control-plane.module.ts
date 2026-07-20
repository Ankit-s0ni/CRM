import { Module } from '@nestjs/common';
import { TenantAuditModule } from '../tenant-audit/tenant-audit.module';
import { PlatformBillingModule } from './billing/platform-billing.module';
import { ImpersonationModule } from './impersonation/impersonation.module';
import { PlatformModulesModule } from './modules/platform-modules.module';
import { PlatformOperationsModule } from './operations/platform-operations.module';
import { PlatformAuthModule } from './platform-auth/platform-auth.module';
import { PlatformTenantsModule } from './tenants/platform-tenants.module';

const CONTROL_PLANE_MODULES = [
  PlatformAuthModule,
  PlatformTenantsModule,
  PlatformModulesModule,
  ImpersonationModule,
  PlatformOperationsModule,
  PlatformBillingModule,
  TenantAuditModule,
];

@Module({
  imports: CONTROL_PLANE_MODULES,
  exports: CONTROL_PLANE_MODULES,
})
export class PlatformControlPlaneModule {}
