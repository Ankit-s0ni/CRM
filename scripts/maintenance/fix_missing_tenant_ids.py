import re
import glob

# Get all models in schema.prisma and find which ones have tenantId
with open('apps/api/prisma/schema.prisma', 'r') as f:
    schema = f.read()

models = re.findall(r'model\s+(\w+)\s+\{([^}]*)\}', schema)
tables_with_tenant_id = []
for model_name, body in models:
    if 'tenantId' in body:
        match = re.search(r'@@map\("([^"]+)"\)', body)
        if match:
            tables_with_tenant_id.append(match.group(1))

# Read migration.sql
mig_files = glob.glob('apps/api/prisma/migrations/*_rls_and_partitions/migration.sql')
for mig_file in mig_files:
    with open(mig_file, 'r') as f:
        mig = f.read()

    # Find the tenant_tables text[] array
    array_match = re.search(r'tenant_tables\s*text\[\]\s*:=\s*ARRAY\[(.*?)\];', mig, re.DOTALL)
    if array_match:
        array_content = array_match.group(1)
        tables = re.findall(r"'([^']+)'", array_content)
        
        valid_tables = [t for t in tables if t in tables_with_tenant_id]
        
        new_array = ",\n    ".join(f"'{t}'" for t in valid_tables)
        new_mig = mig[:array_match.start(1)] + "\n    " + new_array + "\n  " + mig[array_match.end(1):]
        
        with open(mig_file, 'w') as f:
            f.write(new_mig)
