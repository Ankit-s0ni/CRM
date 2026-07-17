CREATE TYPE "BiometricConsentAction" AS ENUM ('GRANTED', 'WITHDRAWN');

ALTER TABLE biometric_consents
  ADD COLUMN "action" "BiometricConsentAction" NOT NULL DEFAULT 'GRANTED';

DROP INDEX IF EXISTS biometric_consents_tenantId_employeeId_idx;
CREATE INDEX biometric_consents_tenantId_employeeId_consentedAt_idx
  ON biometric_consents("tenantId", "employeeId", "consentedAt");

-- Consent records are legal history: runtime may append and read only.
REVOKE UPDATE, DELETE ON biometric_consents FROM app_user;
