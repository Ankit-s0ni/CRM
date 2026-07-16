ALTER TABLE "tenants"
  ADD COLUMN "suspendedByPlatformUserId" UUID,
  ADD COLUMN "onboardingIdempotencyKey" TEXT,
  ADD COLUMN "onboardingRequestHash" TEXT;

CREATE UNIQUE INDEX "tenants_onboardingIdempotencyKey_key"
  ON "tenants"("onboardingIdempotencyKey");

CREATE UNIQUE INDEX "tenants_subdomain_lower_key"
  ON "tenants" (LOWER("subdomain"));

CREATE INDEX "tenants_status_createdAt_idx"
  ON "tenants" ("status", "createdAt" DESC);
