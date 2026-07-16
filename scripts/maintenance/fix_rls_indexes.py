import sys
import glob

files = glob.glob('apps/api/prisma/migrations/*_rls_and_partitions/migration.sql')

for file in files:
    with open(file, 'r') as f:
        text = f.read()

    text = text.replace('is_primary', '"isPrimary"')
    text = text.replace('is_default', '"isDefault"')
    text = text.replace('effective_date', '"effectiveDate"')
    text = text.replace('end_date', '"endDate"')
    text = text.replace('roster_date', '"rosterDate"')
    text = text.replace('holiday_date', '"holidayDate"')
    text = text.replace('office_location_id', '"officeLocationId"')
    text = text.replace('attendance_date', '"attendanceDate"')

    with open(file, 'w') as f:
        f.write(text)
