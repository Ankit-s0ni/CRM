import { SetMetadata } from '@nestjs/common';
import { PLATFORM_PERMISSIONS_KEY } from './platform-permission.guard';
import type { PlatformPermissionKey } from './platform-permissions';

export const RequirePlatformPermissions = (
  ...permissions: PlatformPermissionKey[]
) => SetMetadata(PLATFORM_PERMISSIONS_KEY, permissions);
