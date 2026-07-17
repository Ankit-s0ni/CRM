export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  deviceId?: string;
  impersonationSessionId?: string;
  impersonationPlatformUserId?: string;
  impersonationScopes?: string[];
}
