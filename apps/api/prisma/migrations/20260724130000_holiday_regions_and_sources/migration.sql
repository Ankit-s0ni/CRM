CREATE TYPE "HolidaySource" AS ENUM ('MANUAL', 'PUBLIC_DATA');

ALTER TABLE "office_locations"
  ADD COLUMN "countryCode" CHAR(2),
  ADD COLUMN "subdivisionCode" VARCHAR(16);

ALTER TABLE "tenant_holidays"
  ADD COLUMN "source" "HolidaySource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "sourceProvider" TEXT;
