export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions?: string[];
  exp?: number;
  deviceId?: string;
  impersonationSessionId?: string;
  impersonationPlatformUserId?: string;
  impersonationScopes?: string[];
}
