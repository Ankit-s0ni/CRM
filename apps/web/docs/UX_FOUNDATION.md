# DeltCRM UX Foundation

This is the Phase 1 source of truth for improving the web app UX. It covers audit findings, reusable UI inventory, and the foundation rules future phases should follow. Keep backend behavior unchanged when applying these rules.

## Product Direction

DeltCRM is a dense multi-tenant HR operations console. The interface should optimize for scan speed, repeat work, clear status, and low-risk decisions. Avoid marketing-style layouts inside the app: no oversized heroes, decorative panels, nested cards, or ornamental motion in operational workflows.

## Primary Workflow Audit

| Area | Current UX Surface | Phase 1 Finding | Foundation Direction |
| --- | --- | --- | --- |
| Login, signup, invitation, forgot password | Public platform routes under `apps/web/src/app/(public-platform)` | Auth flows are separate from the tenant shell and need consistent form, error, and success states. | Use visible labels, browser autofill, inline errors, one primary action, and clear recovery links. |
| Tenant dashboard | `TenantDashboard` in `apps/web/src/shared/layouts/tenant-dashboard.tsx` | Already action-oriented, but uses local card/status styles. | Move toward shared status badges, metric cards, loading, and error primitives. |
| Employee directory/profile/create/import | `organization-access-views.tsx` and employee routes | Tables, import states, and create forms repeat local styling. | Standardize table shell, filter toolbar, form fields, upload/import empty states. |
| Attendance dashboard/register/regularizations/field/devices/security | Attendance feature views | Dense operational workflows depend on filters, status, and tables. | Standardize filter bars, status language, sticky table headers, responsive table handling. |
| Leave requests and approvals | Attendance/leave and leave module routes | Approval queues need strong pending/approved/rejected affordances. | Use shared status tones and confirmation patterns. |
| Payroll runs, payslips, exports | Payroll feature workspaces | Many admin panels and forms use `AdminPage`, `Panel`, `PrimaryButton`, and `inputClass`. | Keep those exports stable but align their styling with the new foundation. |
| Settings, modules, roles/access, localization | Workspace settings and organization access views | Settings pages contain long forms and permission matrices. | Use sectioned forms, sticky save areas later, and consistent validation text. |
| Platform admin: tenants, modules, plans, billing, audit, health | Platform routes under `(public-platform)/platform` | Admin pages need the same table, status, and audit readability rules. | Reuse the same foundation primitives as tenant admin pages. |

## UX Inventory

| Pattern | Existing Surface | Standard Going Forward |
| --- | --- | --- |
| Page headers | `AdminPage`, many custom headers | One `h1`, compact description, optional action, max content width. |
| Cards and panels | `Panel`, `Card`, many rounded local cards | Use `Panel` or `Card`; no nested cards; prefer `8px`-style radius for dense tools. |
| Tables | Many hand-styled `<table>` blocks | Use `TableShell` and exported table class constants. |
| Forms | `Field`, `inputClass`, local labels | Use visible labels, `inputClass`, helper/error text near fields. |
| Empty states | `EmptyState` | Use title, body, optional action; avoid vague empty copy. |
| Error states | `ErrorState` | Use `role="alert"`, concise message, optional retry/action. |
| Loading states | `LoadingState` | Use skeleton rows sized to the expected content; avoid blank screens. |
| Confirmation dialogs | `Dialog` primitives | Use risk-based confirmation in later phases. |
| Status badges | Local badge class maps | Use `StatusBadge` tones: neutral, info, success, warning, danger, pending. |
| Filters/search controls | Local toolbars and inputs | Use `Toolbar`, `inputClass`, URL-backed filters for shareability later. |
| Navigation patterns | Tenant shell, context nav, module chrome | Preserve shell; add breadcrumbs/command search in later phases. |

## Design System Source

### Spacing

Use a dense dashboard scale: `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`. Prefer `gap-3` or `gap-4` in panels and `p-4` or `p-5` in dense admin content.

### Typography

Use `uxTypography` from `src/shared/design-system/ux-foundation.ts`.

| Use | Rule |
| --- | --- |
| Page title | `text-2xl md:text-3xl`, semibold, tight tracking |
| Section title | `text-base`, semibold |
| Panel title | `text-sm`, semibold |
| Body | `text-sm`, `leading-6` |
| Helper text | `text-xs`, muted |
| Metrics | tabular numbers, strong weight |

### Color Tokens

Global CSS exposes Tailwind color tokens for app primitives: `primary`, `primary-foreground`, `secondary`, `background`, `foreground`, `card`, `muted`, `border`, `input`, `ring`, `accent`, and `destructive`.

Status colors:

| Tone | Meaning |
| --- | --- |
| neutral | Draft, inactive, unavailable, no data |
| info | Informational state |
| success | Active, present, completed, approved |
| warning | Late, stale, requires attention |
| danger | Error, absent, failed, destructive |
| pending | Waiting, queued, submitted |

### Card And Panel Styles

Use `uxPanel`/`Panel` for framed content. Cards should represent repeated items or self-contained panels only. Do not put cards inside cards unless the inner card is an actual repeated list item.

### Table Styles

Use `TableShell` plus `tableClass`, `tableHeadClass`, `tableHeadCellClass`, `tableRowClass`, and `tableCellClass`. Tables must handle horizontal overflow on small screens and should expose loading, empty, and error states.

### Form Field Styles

Use `Field` and `inputClass`. Inputs should be at least `44px` tall for touch, have visible labels, support `aria-invalid`, and show field-specific errors near the field.

### Button Hierarchy

Use one primary action per surface. Secondary actions use outline/ghost variants. Destructive actions should use destructive styling and confirmation where risk is meaningful.

### Icon Rules

Use `lucide-react` icons. Icon-only buttons require `aria-label` and a visible focus state. Directional icons must use the existing `directional-icon` class when they represent movement.

### Focus And Keyboard States

All interactive controls need visible focus. Global CSS now provides a default `focus-visible` outline; component classes may use `focusRingClass` for more controlled styling. Avoid keyboard traps in dialogs and drawers.

### RTL/LTR Behavior

Prefer logical properties (`start`, `end`, `ps`, `pe`, `ms`, `me`) over left/right. Keep Arabic text in a valid encoding, use `bdi` for mixed identifiers, and flip directional icons with `directional-icon`.

## Phase 1 Implementation Notes

New reusable frontend foundation:

- `src/shared/design-system/ux-foundation.ts`
- Expanded `src/shared/components/page-primitives.tsx`
- Token additions in `src/app/globals.css`

These are additive foundations for later phases. Existing feature screens can migrate gradually without changing backend APIs.

## Final UX Completion Notes

Phases 10-12 should keep the app frontend-only and preserve existing business logic. The finalized UX direction is:

- Use role-aware dashboard shortcuts to reduce navigation effort without granting access.
- Use command search on desktop and mobile for fast cross-module movement.
- Use guided workflow steps for risky or multi-step work such as employee import.
- Use shared toolbar/filter/status patterns for reports, attendance, employees, imports, and approvals.
- Use restrained auth screens that match the operational app instead of marketing-heavy decoration.
- Keep error, loading, empty, focus, and RTL behavior consistent across every frontend surface.

Before future UX work is considered complete, run `pnpm --filter web typecheck` and targeted ESLint for the touched frontend files.
