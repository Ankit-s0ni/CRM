# DeltCRM Product Contracts

This package is the only approved dependency surface between the DeltCRM Platform and product services. It contains data contracts and validators only. It must never contain Prisma clients, NestJS providers, React components or product business logic.

## Versioning

- Patch: documentation or validator fixes that do not alter accepted payloads.
- Minor: backward-compatible optional fields or new enum values explicitly tolerated by consumers.
- Major: removed/renamed fields, stricter required fields, changed semantics or incompatible routes.
- Event payloads are immutable after release; incompatible events receive a new `.v2` event type.

Run `pnpm --filter @deltcrm/product-contracts test` and `pnpm --filter @deltcrm/product-contracts compatibility:check` before release. Registry publication remains an explicit release action and must target the approved private registry.

## Internal service authentication

Internal clients identify both the product and its rotating credential:

```ts
new ProductIntegrationClient({
  baseUrl: platformInternalUrl,
  serviceProductKey: 'HRMS',
  serviceKey: secretFromRuntime,
});
```

The client sends `X-Product-Key` and `X-Product-Service-Key`. Platform rejects
missing product identity, invalid credentials and attempts to access another
product's scoped route. Credentials belong in the runtime secret manager, not
this package or a product repository.

Products must refresh `identityStatus` and entitlements for protected requests.
In contract v1, `membershipId` equals `userId` because the current Platform
schema has one tenant membership per user. Products must not infer that rule;
they consume the returned membership lifecycle status so Platform can introduce
a separate membership entity later without changing product authorization.
