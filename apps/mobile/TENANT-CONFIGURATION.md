# Mobile tenant configuration

The app resolves client identity and environment at compile time through Flutter `--dart-define-from-file`. No company-specific Dart edits are required.

```sh
# A physical Android device can reach this profile after `adb reverse` below.
adb reverse tcp:4001 tcp:4001
flutter run --dart-define-from-file=config/northstar.development.json
flutter build appbundle --release --dart-define-from-file=config/client.production.json
flutter build web --wasm --release --dart-define-from-file=config/client.production.json
```

The checked-in development profile targets the seeded `acme` workspace at
`http://127.0.0.1:4001` and keeps `LOCAL_MODE=false`, so module visibility and
attendance verification always come from `GET /mobile/runtime-config`.
Compile-time define changes require a full app restart, not hot reload.

Copy `config/tenant.example.json` for each deployment profile. Production configuration should set `LOCAL_MODE` to `false` and provide the tenant API base URL. `LOCAL_MODE=true` is reserved for isolated UI tests because it deliberately bypasses tenant policy APIs.

Runtime tenant data is represented by `TenantConfig`: branding, locale, timezone, currency, country, weekend, module entitlements and attendance policy. The local profile provides development defaults; the API can replace this object after workspace discovery without changing presentation widgets.

Supported locales are English (`en`) and Arabic (`ar`). Arabic activates RTL automatically. Add future locales by creating another ARB file in `lib/l10n` and running `flutter gen-l10n`.
