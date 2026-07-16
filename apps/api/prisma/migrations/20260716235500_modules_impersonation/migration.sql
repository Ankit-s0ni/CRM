CREATE TYPE "ModuleAvailability" AS ENUM ('AVAILABLE', 'COMING_SOON', 'DEPRECATED');

ALTER TABLE "modules"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "availability" "ModuleAvailability" NOT NULL DEFAULT 'AVAILABLE',
  ADD COLUMN "dependencyKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "conflictKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "impersonation_sessions"
  ADD COLUMN "platformSessionId" UUID,
  ADD COLUMN "tokenJti" UUID,
  ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "endedReason" TEXT,
  ADD COLUMN "endedByPlatformUserId" UUID;

UPDATE "impersonation_sessions" AS impersonation
SET "platformSessionId" = (
  SELECT id
  FROM "platform_sessions"
  WHERE "platformUserId" = impersonation."platformUserId"
  ORDER BY "createdAt" DESC
  LIMIT 1
);

DELETE FROM "impersonation_sessions" WHERE "platformSessionId" IS NULL;

UPDATE "impersonation_sessions"
SET "tokenJti" = gen_random_uuid()
WHERE "tokenJti" IS NULL;

ALTER TABLE "impersonation_sessions"
  ALTER COLUMN "platformSessionId" SET NOT NULL,
  ALTER COLUMN "tokenJti" SET NOT NULL;

CREATE UNIQUE INDEX "impersonation_sessions_tokenJti_key"
  ON "impersonation_sessions"("tokenJti");
CREATE INDEX "impersonation_sessions_platformUserId_endedAt_expiresAt_idx"
  ON "impersonation_sessions"("platformUserId", "endedAt", "expiresAt");
CREATE INDEX "impersonation_sessions_targetUserId_endedAt_expiresAt_idx"
  ON "impersonation_sessions"("targetUserId", "endedAt", "expiresAt");

ALTER TABLE "impersonation_sessions"
  ADD CONSTRAINT "impersonation_sessions_platformSessionId_fkey"
  FOREIGN KEY ("platformSessionId") REFERENCES "platform_sessions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
