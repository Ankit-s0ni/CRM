-- PostgreSQL unique constraints treat NULL values as distinct, so the original
-- composite holiday key did not protect concurrent tenant-wide holiday writes.
CREATE UNIQUE INDEX tenant_holidays_tenant_wide_date_uq
  ON tenant_holidays ("tenantId", "holidayDate")
  WHERE "officeLocationId" IS NULL;

CREATE UNIQUE INDEX tenant_holidays_office_date_uq
  ON tenant_holidays ("tenantId", "officeLocationId", "holidayDate")
  WHERE "officeLocationId" IS NOT NULL;
