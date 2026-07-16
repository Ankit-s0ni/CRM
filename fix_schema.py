import re

with open("apps/api/prisma/schema.prisma", "r") as f:
    content = f.read()

# Fix generator and datasource
content = re.sub(r'generator client \{ provider = "prisma-client-js" \}', 'generator client {\n  provider = "prisma-client-js"\n}\n', content)
content = re.sub(r'datasource db \{ provider = "postgresql"\s+url = env\("DATABASE_URL"\)\s*\}', 'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n', content)

# Fix enums
def fix_enum(match):
    enum_name = match.group(1)
    values = match.group(2).strip().split()
    body = "\n  ".join(values)
    return f"enum {enum_name} {{\n  {body}\n}}"

content = re.sub(r'enum\s+(\w+)\s*\{\s*([^}]+)\s*\}', fix_enum, content)

with open("apps/api/prisma/schema.prisma", "w") as f:
    f.write(content)
