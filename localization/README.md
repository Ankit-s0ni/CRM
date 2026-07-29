# Tenant UI localization catalog

The source catalog is generated from user-facing text in the tenant web app.
Arabic values are drafts until a Super Admin reviews and publishes the locale
pack. Published `ar` is the common fallback; `ar-OM` and `ar-AE` packs can
override regional wording.

## Workflow

```bash
pnpm i18n:audit
pnpm i18n:catalog:generate
pnpm i18n:catalog:sync
```

The sync command registers English source keys and imports non-empty Arabic
values into the current Arabic draft pack. It never publishes a locale pack.

To fill missing Arabic values with the local Argos-based LibreTranslate service:

```bash
TRANSLATION_API_URL=http://127.0.0.1:5000/translate \
  pnpm i18n:catalog:translate-ar
```

Set `TRANSLATION_PROVIDER=google-compatible` only for an approved endpoint
using that query and response shape. Any non-local endpoint also requires the
explicit `ALLOW_EXTERNAL_TRANSLATION=true` acknowledgement because tenant UI
copy will leave the development machine.

After translation:

1. Run `pnpm i18n:catalog:sync`.
2. Review the Arabic draft in Super Admin.
3. Correct product terminology and regional wording.
4. Move the pack through review and publish it.
5. Migrate each hardcoded component string to its generated catalog key.

Catalog registration alone does not translate a component. The component must
read the key through `next-intl`; the audit remains non-zero until that migration
is complete.
