import sys
import glob

files = glob.glob('apps/api/prisma/migrations/*_rls_and_partitions/migration.sql')
for file in files:
    with open(file, 'r') as f:
        text = f.read()

    text = text.replace("'user_roles',", "")
    text = text.replace("'role_permissions',", "")
    
    with open(file, 'w') as f:
        f.write(text)
