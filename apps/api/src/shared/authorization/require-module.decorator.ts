import { SetMetadata } from '@nestjs/common';
export const REQUIRED_MODULE_KEY = 'required_workspace_module';
export const RequireModule = (moduleKey: string) =>
  SetMetadata(REQUIRED_MODULE_KEY, moduleKey.toUpperCase());
