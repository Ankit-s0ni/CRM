# Platform Schema Migration Compatibility Guide

## Why there are two schema files

The Platform repository contains two Prisma schema files:

| File | Purpose | Status |
|---|---|---|
| `prisma/schema.prisma` | Legacy full schema (Platform + HRMS combined) | Kept for existing production database compatibility — do NOT delete |
| `prisma/platform/schema.prisma` | Platform-only clean schema | Used for fresh Platform installations and Platform client generation |

---

## For fresh installations (new Platform database)

Use the Platform-only migration track:

```bash
# Set PLATFORM_DATABASE_URL to the new Platform-only database
export PLATFORM_DATABASE_URL="postgresql://..."

# Deploy Platform-only migrations
pnpm --filter api prisma:migrate:deploy:platform

# Seed Platform data
BOOTSTRAP_PLATFORM=1 bash scripts/deploy-production.sh
```

The deployment script generates missing production credentials once and then
preserves them on every rerun. It configures the environment before seeding, so
the protected credentials file and stored password hashes cannot drift apart.
`BOOTSTRAP_PLATFORM=1` is for a new database only; ordinary releases omit it.

This creates a database containing **only Platform-owned tables** — no HRMS tables.

The command uses `apps/api/prisma.platform.config.ts`. Do not invoke the
Platform schema with the default `prisma.config.ts`: the default configuration
intentionally points at the legacy migration history for transition-only
databases.

---

## For existing production databases (already deployed with the full schema)

The existing production database has both Platform and HRMS tables created by the legacy migration track (`prisma/migrations/`). **Do not reset or drop this database.**

The safe advancement path is:

1. **Do not run `prisma migrate reset` or `prisma db push` against production.**
2. Continue using `prisma migrate deploy --schema=prisma/schema.prisma` for any schema changes that need to go to the existing production database during the transition window.
3. Use **additive-only** schema changes — never drop columns or tables in this path.
4. Once production is fully migrated to the HRMS service, the legacy schema file can be archived (not deleted).

---

## Prisma client generation

The Platform application uses `@prisma/client` generated from `prisma/schema.prisma` for runtime access. The `src/generated/platform-client` is the future Platform-only client.

```bash
# Generate both clients
pnpm --filter api prisma:generate:all

# Generate only the Platform-only client
pnpm --filter api prisma:generate:platform
```

---

## Schema purity enforcement

An architecture guard test runs in CI to enforce that:
- The Platform-only schema contains no HRMS models or enums
- Platform runtime source code does not access HRMS Prisma table accessors
- Platform does not import HRMS application code

```bash
# Run architecture guard
pnpm --filter api test:architecture
```

---

## When is the legacy schema safe to remove?

Only after all three conditions are met:

1. ✅ Production cutover complete — all tenants served from HRMS service
2. ✅ Platform runtime code does not access any HRMS tables
3. ✅ A separate approved data retention project removes HRMS tables from the old database

**Never remove legacy migrations.** They are the history of how the production database was built.
