# Backend Module Development

## Operating Model

DeltCRM is a modular monolith. Each product has one owning team, one composition root,
one public TypeScript entry point and explicit database ownership. Physical capability
folders are implementation details and do not imply separate commercial products.

## Allowed Direction

```text
presentation -> application -> domain
                       ^
infrastructure --------|

product A -> product B/public.ts
shared -X-> any business module
domain -X-> NestJS, Prisma, HTTP or provider SDKs
```

Controllers parse transport input and call a use case. Application services coordinate
transactions and ports. Domain files contain pure rules. Infrastructure files contain
Prisma, queues, storage and provider adapters.

## Change Checklist

- Identify the owner and product before adding a file.
- Extend an existing capability unless the business responsibility has a distinct owner.
- Keep route compatibility and stable error codes.
- Put provider SDK usage in infrastructure or an explicitly documented legacy adapter.
- Use the target product's `public.ts`; never deep-import its service or repository.
- Write another context's data only through its command/event contract.
- Include tenant context, authorization, audit and idempotency in mutation use cases.
- Add/update unit, contract, tenant-isolation and e2e coverage.
- Run `pnpm --filter api architecture:test` before review.

## New Product Journey

1. Copy `architecture/templates/module` to `src/products/<product>`.
2. Create a composition root and export it from `public.ts`.
3. Register the product, owner and physical roots in `module-boundaries.json`.
4. Add database ownership before creating schema models.
5. Register its composition root in `AppModule` through `public.ts` only.
6. Add catalog, permissions, navigation metadata and seed fixtures through their owning public contracts.
7. Add an architecture self-test proving forbidden product dependencies remain rejected.

The POS example in `architecture/examples/pos` demonstrates the expected isolation.

## Legacy Baseline

Existing internal dependencies are frozen, not endorsed. They may be removed without
approval; adding a new one fails CI. See `ADR-0001-LEGACY-DEPENDENCY-BASELINE.md` for
the remaining cycles and migration order.
