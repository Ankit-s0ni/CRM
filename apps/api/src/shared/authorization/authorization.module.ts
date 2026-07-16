import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { ModuleGuard } from './module.guard';

@Global()
@Module({
  providers: [PermissionsGuard, ModuleGuard],
  exports: [PermissionsGuard, ModuleGuard],
})
export class AuthorizationModule {}
