ALTER TABLE "platform_users"
  ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

ALTER TYPE "RevokeReason" ADD VALUE IF NOT EXISTS 'ROTATED';

CREATE TABLE "platform_auth_challenges" (
  "id" UUID NOT NULL,
  "platformUserId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdIp" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_auth_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_sessions" (
  "id" UUID NOT NULL,
  "platformUserId" UUID NOT NULL,
  "mfaVerifiedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdIp" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_refresh_tokens" (
  "id" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "familyId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" "RevokeReason",
  "createdIp" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_mfa_recovery_codes" (
  "id" UUID NOT NULL,
  "platformUserId" UUID NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_permissions" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_role_permissions" (
  "role" "PlatformRole" NOT NULL,
  "permissionId" UUID NOT NULL,
  CONSTRAINT "platform_role_permissions_pkey" PRIMARY KEY ("role", "permissionId")
);

CREATE UNIQUE INDEX "platform_auth_challenges_tokenHash_key" ON "platform_auth_challenges"("tokenHash");
CREATE INDEX "platform_auth_challenges_platformUserId_expiresAt_idx" ON "platform_auth_challenges"("platformUserId", "expiresAt");
CREATE INDEX "platform_sessions_platformUserId_revokedAt_expiresAt_idx" ON "platform_sessions"("platformUserId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX "platform_refresh_tokens_tokenHash_key" ON "platform_refresh_tokens"("tokenHash");
CREATE INDEX "platform_refresh_tokens_sessionId_familyId_revokedAt_idx" ON "platform_refresh_tokens"("sessionId", "familyId", "revokedAt");
CREATE UNIQUE INDEX "platform_mfa_recovery_codes_codeHash_key" ON "platform_mfa_recovery_codes"("codeHash");
CREATE INDEX "platform_mfa_recovery_codes_platformUserId_usedAt_idx" ON "platform_mfa_recovery_codes"("platformUserId", "usedAt");
CREATE UNIQUE INDEX "platform_permissions_key_key" ON "platform_permissions"("key");

ALTER TABLE "platform_auth_challenges" ADD CONSTRAINT "platform_auth_challenges_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_sessions" ADD CONSTRAINT "platform_sessions_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_refresh_tokens" ADD CONSTRAINT "platform_refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "platform_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_mfa_recovery_codes" ADD CONSTRAINT "platform_mfa_recovery_codes_platformUserId_fkey" FOREIGN KEY ("platformUserId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_role_permissions" ADD CONSTRAINT "platform_role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "platform_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

REVOKE ALL ON platform_users, platform_auth_challenges, platform_sessions,
  platform_refresh_tokens, platform_mfa_recovery_codes, platform_permissions,
  platform_role_permissions, system_audit_logs FROM app_user;
