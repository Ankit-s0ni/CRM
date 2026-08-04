# Verification Matrix

Run all rows matching the changed files or behavior.

| Changed scope | Mandatory verification |
| --- | --- |
| Any change | `git diff --check`; inspect final diff and `git status --short` |
| API TypeScript | `pnpm --filter api typecheck`; targeted Jest tests; `pnpm --filter api lint`; `pnpm --filter api build` |
| API architecture/boundaries | API checks plus `pnpm architecture:check` |
| API route/DTO | Targeted e2e; `pnpm openapi:generate`; confirm generated contract drift |
| Prisma schema/migration | `prisma validate`; inspect SQL; apply to a disposable/seeded database; migration status; tenant/RLS regression tests |
| Worker/job/event | Unit/integration test retries, idempotency, tenant context, failure/dead-letter behavior; build API and worker |
| Web TypeScript/UI | `pnpm --filter web typecheck`; relevant lint/tests; `pnpm --filter web build` |
| Navigation/locale routes | Web checks plus `pnpm --filter web check:localized-navigation` |
| Localization | `pnpm i18n:audit:strict`; `pnpm i18n:catalog:validate`; verify English LTR and Arabic RTL |
| Theme/design tokens | Verify all supported themes and scan touched components for raw colors/fonts/arbitrary typography |
| Responsive UI | Verify approximately 375px, 768px, 1024px, and 1440px; no clipping or horizontal scroll |
| Accessibility-sensitive UI | Keyboard-only flow, focus visibility, labels/names, error association, contrast, reduced motion |
| Flutter | `flutter analyze`; relevant `flutter test`; physical/emulator smoke test for changed native capability |
| Mobile release | Flutter checks plus `pnpm release:mobile:check` and requested APK/AAB build |
| Landing | Landing typecheck/lint/build when available; responsive and reduced-motion visual smoke test |
| Security/auth/RBAC | Targeted denial and cross-tenant tests plus `pnpm security:check` |
| Broad/release candidate | `pnpm quality` and required environment/provider smoke tests |

## Handoff Evidence

Report behavior changed, files/domains affected, migration/contract impact, exact passing commands, checks not run and why, known risks, and commit/deployment state.

A typecheck alone is not sufficient for runtime, authorization, data, or visual changes.
