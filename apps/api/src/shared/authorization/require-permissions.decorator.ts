import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from './permissions.constants';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';
export const REQUIRED_ANY_PERMISSIONS_KEY = 'required_any_permissions';

export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const RequireAnyPermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, permissions);
