# DeltCRM Repository Rules

These rules apply to every developer and coding agent working in this repository.
For the complete workflow and checklists, use
`.agents/skills/deltcrm-engineering-standards/SKILL.md`.

## Before Changing Code

- Inspect the existing implementation, nearby tests, contracts, and design patterns before editing.
- Preserve unrelated local changes. Never reset, discard, or rewrite another contributor's work.
- Keep changes inside the owning product/domain. Do not create cross-domain shortcuts or direct database access between products.
- Clarify behavior with the product owner only when a decision has materially different business, security, or data consequences.

## Architecture And Security

- Treat tenant identity as server-authoritative. Every tenant query and mutation must be tenant-scoped and covered by isolation tests.
- Enforce RBAC and entitlements in the API. Hiding a button in the UI is not authorization.
- Use the shared API clients and generated contracts. Do not add page-specific Axios/fetch clients or duplicate API types.
- Keep Next.js pages/layouts as Server Components by default and interactive Client Components at the leaves.
- Keep controllers thin, validate DTOs, place business rules in the owning application/domain layer, and emit audit/outbox events for sensitive changes.
- Never log passwords, tokens, biometric data, complete identity numbers, SMTP credentials, or other secrets.

## UI And Localization

- Use existing components, semantic design tokens, and the shared typography scale. Never hardcode colors, font families, arbitrary pixel font sizes, or one-off shadows in feature components.
- New UI must work across every supported theme, English LTR, Arabic RTL, desktop, tablet, and mobile.
- Put every user-facing string through the localization system. Do not implement Arabic by only changing direction or by embedding translations in components.
- Maintain accessible labels, keyboard navigation, visible focus, sufficient contrast, meaningful loading/empty/error states, and at least 44px touch targets.
- Use Lucide/shared SVG icons rather than emoji or inconsistent icon libraries.

## Data And Production Safety

- Prisma migrations are forward-only, reviewed, and production-safe. Prefer additive schema changes, deterministic backfills, compatibility windows, then cleanup in a later release.
- Never run `prisma db push`, `prisma migrate reset`, database recreation, truncate/drop commands, or seed scripts against production.
- Never deploy automatically as part of ordinary implementation. Deployment requires an explicit request and a backup/status/smoke-test sequence.
- Production deployment uses `prisma migrate deploy`, never `migrate dev`, and must not delete or replace tenant data.
- Secrets belong in environment/secret management and must never be committed.

## Quality Gate

- Add or update tests for changed behavior, including authorization, tenant isolation, validation, failure paths, and responsive/localized UI where applicable.
- Run the smallest relevant checks while iterating, then all checks required by the changed scope before handoff.
- Web minimum: `pnpm --filter web typecheck`, relevant lint/tests, and `pnpm --filter web build`.
- API minimum: `pnpm --filter api typecheck`, relevant unit/e2e tests, architecture check, and `pnpm --filter api build`.
- Localization changes: `pnpm i18n:audit:strict` and `pnpm i18n:catalog:validate`.
- Contract changes: regenerate OpenAPI/contracts and verify that generated drift is intentional.
- Mobile changes: `flutter analyze`, relevant `flutter test`, and the requested release build when applicable.
- Do not mark work complete without reporting what passed, what was not run, and any remaining risk.
