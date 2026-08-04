# Architecture And Quality Reference

## Repository Map

| Area | Ownership |
| --- | --- |
| `apps/api` | NestJS API, workers, Prisma schema/migrations, domain/application/infrastructure code |
| `apps/web` | Next.js App Router platform and tenant portals |
| `apps/mobile` | Flutter employee application |
| `apps/landing` | Public marketing site |
| `packages/contracts` | Generated/shared API contracts |
| `localization` | Source localization catalogs |
| `scripts` | Quality, generation, release, and operations automation |
| `deploy`, `ecosystem.config.cjs` | Production process and deployment configuration |

## API Checklist

- Validate request DTOs and reject unknown/invalid values deliberately.
- Authenticate first, establish tenant context, then authorize permission and scope.
- Validate product entitlement independently of role permission.
- Apply tenant predicates to every tenant-owned query, mutation, aggregate, export, and background job.
- Prevent object-ID access across tenants even when UUIDs are valid.
- Use a transaction for state change plus audit/outbox records.
- Keep domain calculations deterministic and timezone/currency aware.
- Add idempotency for retryable commands, webhooks, imports, email jobs, and mobile sync.
- Avoid N+1 reads and unbounded list/export operations.
- Redact secrets and sensitive employee/biometric/identity data from logs.

## Web Checklist

- Keep routes thin; put reusable behavior in feature/shared layers.
- Use shared API clients, auth store, navigation guards, and generated types.
- Model async states explicitly: initial loading, refresh, empty, partial, error, success.
- Preserve deep links, browser back behavior, locale prefix, and tenant host.
- Do not use client-only values during server rendering without a stable hydration strategy.
- Do not force remounts or mutate DOM outside React to fix localization/layout defects.
- Use semantic HTML and accessible names for all controls.

## Design System Checklist

- Colors come from semantic CSS variables/Tailwind tokens, not feature literals.
- Font families and type scale come from global tokens.
- Spacing follows the shared scale; avoid arbitrary values unless required by an external measured constraint.
- Status is communicated by text/icon as well as color.
- Theme changes affect the complete page, not only navigation or buttons.
- Test long names, Arabic text, empty data, dense data, and validation messages.
- Tables have responsive behavior, meaningful pagination, and accessible headers.
- Forms group related fields, preserve entered data after recoverable failure, and show errors beside the field.

## Localization Checklist

- Add source keys through the catalog workflow instead of editing generated key files manually.
- Provide English source and reviewed Arabic values or intentional fallback.
- Use locale-aware formatters for dates, times, durations, money, and pluralization.
- Check direction-sensitive icons, alignment, order, tables, charts, and dialogs under RTL.
- Never translate identifiers, employee codes, emails, currency codes, or stored enum values directly.

## Testing Expectations

- Unit-test calculations, validation, state transitions, and policy precedence.
- API-test permissions, tenant isolation, invalid IDs, duplicate/retry behavior, and response contracts.
- E2E-test the critical user workflow, not only individual endpoints.
- UI-test interactive state, localized navigation, responsive layouts, and failure recovery.
- Regression tests must fail before the fix when practical.
