import sys
import glob

files = glob.glob('apps/api/prisma/migrations/*_rls_and_partitions/migration.sql')
if not files:
    print("No file found")
    sys.exit(1)

for file in files:
    with open(file, 'r') as f:
        text = f.read()

    # Replace snake_case with Prisma's camelCase
    text = text.replace('tenant_id', '"tenantId"')
    # Revert the current_setting key back to app.tenant_id since that is what we SET
    text = text.replace("'app.\"tenantId\"'", "'app.tenant_id'")
    
    text = text.replace('employee_id', '"employeeId"')
    text = text.replace('dept_id', '"deptId"')
    text = text.replace('client_event_uuid', '"clientEventUuid"')
    text = text.replace('event_time', '"eventTime"')

    with open(file, 'w') as f:
        f.write(text)
