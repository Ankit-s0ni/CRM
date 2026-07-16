-- Keep Prisma's declared compound uniques as valid ON CONFLICT targets while
-- the stricter lower(name) indexes enforce case-insensitive uniqueness.
CREATE UNIQUE INDEX "office_locations_tenantId_officeName_key"
  ON office_locations ("tenantId", "officeName");

CREATE UNIQUE INDEX "attendance_policies_tenantId_name_key"
  ON attendance_policies ("tenantId", name);

CREATE UNIQUE INDEX "shifts_tenantId_name_key"
  ON shifts ("tenantId", name);
