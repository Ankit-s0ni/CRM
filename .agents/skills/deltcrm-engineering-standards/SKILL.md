---
name: deltcrm-engineering-standards
description: "Repository-specific engineering workflow and quality standards for DeltCRM. Use whenever implementing, fixing, reviewing, testing, migrating, or deploying changes in the DeltCRM monorepo, including the NestJS/Prisma API, Next.js tenant or platform portals, Flutter employee app, landing site, shared contracts, localization, themes, payroll, attendance, billing, or other product modules."
---

# DeltCRM Engineering Standards

Build changes that are tenant-safe, maintainable, localized, theme-aware, responsive, tested, and safe for production data.

## 1. Establish Scope Before Editing

1. Inspect the current route, owning feature/domain, shared dependencies, contracts, tests, and recent local changes.
2. Identify affected surfaces: API, database, worker, web, mobile, localization, contracts, operations, or deployment.
3. Reuse the established pattern unless it is the source of the defect.
4. State assumptions only after gathering repository evidence.
5. Preserve unrelated work in a dirty worktree.

Read `references/architecture-and-quality.md` when changing architecture, APIs, authorization, tenant data, UI, localization, or mobile behavior.

## 2. Design The Change End To End

Before implementation, trace the complete path:

`UI/mobile -> shared client -> API controller/DTO -> application/domain service -> repository/Prisma -> audit/outbox -> response state`

For every path, determine:

- tenant boundary and reporting scope;
- required permission and product entitlement;
- validation and stable error behavior;
- audit, attribution, and event requirements;
- loading, empty, success, and failure UI;
- localization keys and RTL behavior;
- migration/backfill compatibility;
- unit, integration, isolation, and visual evidence.

Do not solve a server problem with a UI-only workaround. Do not solve a UI problem by duplicating domain logic in a component.

## 3. Implement Within Ownership Boundaries

### API and data

- Keep controllers thin and DTOs explicit.
- Put business rules in the owning application/domain layer.
- Scope tenant reads and writes server-side; never trust a client-provided tenant identifier without authenticated context validation.
- Enforce permissions and entitlements in the API, then mirror them in navigation/UI.
- Use transactions for multi-record invariants and audit/outbox consistency.
- Return stable error codes/messages; do not expose stack traces, SQL errors, or provider secrets.
- Add indexes and query-plan evidence for new high-volume access paths.

### Web

- Keep route `page.tsx` and `layout.tsx` files thin and server-first.
- Place domain UI under the owning feature and reuse shared primitives/layouts.
- Use `apiClient`, `platformApiClient`, and generated contracts instead of creating ad hoc HTTP layers.
- Avoid monolithic components. Extract coherent sections, forms, and state transitions when they can be tested or reused independently.
- Preserve URL-based `en`/`ar` locale routing and workspace/subdomain behavior.

### Flutter

- Use the shared API/configuration and secure storage boundaries.
- Keep secrets and privileged provider credentials out of the binary.
- Preserve offline, retry, permission-denied, and interrupted-flow behavior.
- Verify physical-device constraints for camera, location, integrity, and background work changes.

## 4. Meet The Product UI Standard

- Use the existing DeltCRM shell and component language instead of introducing an isolated visual system.
- Use semantic tokens such as `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, and centralized semantic status tones.
- Never put raw hex/RGB/HSL values, arbitrary font families, decorative one-off shadows, or arbitrary pixel typography in feature components.
- Base typography on the shared Lexend heading and Source Sans body scale. Use hierarchy, not oversized text, to create emphasis.
- Keep success, warning, danger, and informational meaning consistent across themes.
- Design mobile-first, avoid horizontal overflow, and test common desktop/tablet/mobile widths.
- Use visible labels, field-level errors, disabled/loading states, keyboard support, focus visibility, contrast, and 44px touch targets.
- Use motion only to explain state or spatial continuity and honor reduced-motion preferences.

For visual work, also use the repository `ui-ux-pro-max` and `Next.js App Router & Shadcn UI` skills.

## 5. Localize Complete Experiences

- Route tenant pages through `/en/...` and `/ar/...`.
- Put user-facing text in the localization catalog; never ship component-embedded English/Arabic pairs.
- Treat RTL as layout behavior in addition to translated content.
- Use locale-aware date, time, number, and currency formatting.
- Preserve regional Arabic fallback and super-admin publishing controls.
- Run strict localization audit and catalog validation for affected UI.

## 6. Protect Production Data

Read `references/release-and-data-safety.md` before changing Prisma schema, seeds, deployment configuration, PM2 processes, or production infrastructure.

Non-negotiable rules:

- Never reset, recreate, truncate, reseed, or use `db push` on production.
- Make migrations forward-only and production-compatible.
- Separate schema migration from irreversible cleanup.
- Require a verified backup, migration status, and smoke-test plan before deployment.
- Use `prisma migrate deploy` in production.
- Never assume `git pull && pm2 restart` is sufficient when source, generated client, dependencies, migrations, or compiled artifacts changed.

## 7. Verify By Changed Scope

Use `references/verification-matrix.md` to select checks. During iteration run targeted checks; before handoff run every mandatory check for the touched scope.

Always:

1. Run `git diff --check`.
2. Review the final diff for unrelated files, secrets, generated artifacts, raw UI values, and accidental data operations.
3. Report passed checks, skipped checks, and residual risk.
4. Do not claim completion, deployment, or production safety without evidence.

Use full `pnpm quality` for release candidates or broad cross-cutting changes when the required infrastructure is available.

## 8. Review Standard

Prioritize findings in this order:

1. data loss, tenant leakage, auth/RBAC bypass, secret exposure;
2. incorrect payroll/attendance/billing behavior and broken invariants;
3. migration, API-contract, worker, and compatibility regressions;
4. inaccessible, unlocalized, non-responsive, or theme-broken UI;
5. missing tests, observability, and operational evidence;
6. maintainability and polish.

Reference exact files/lines and explain user/business impact. Avoid approval based only on a successful build.
