import type { PlatformRole } from '@prisma/client';

export interface AuthenticatedPlatformUser {
  platformUserId: string;
  email: string;
  role: PlatformRole;
  sessionId: string;
  permissions: string[];
  mfaVerifiedAt: string;
}
