export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  impersonationSessionId?: string;
  impersonationPlatformUserId?: string;
  impersonationScopes?: string[];
}
