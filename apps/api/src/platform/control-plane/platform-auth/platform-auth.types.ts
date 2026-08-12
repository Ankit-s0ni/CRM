import type { PlatformRole } from '../../../generated/platform-client';

export interface AuthenticatedPlatformUser {
  platformUserId: string;
  email: string;
  role: PlatformRole;
  sessionId: string;
  permissions: string[];
  mfaVerifiedAt: string;
}
