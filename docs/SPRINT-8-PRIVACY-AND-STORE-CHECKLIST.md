# Sprint 8 Privacy and Mobile Store Checklist

This is an engineering evidence checklist, not legal advice. Privacy counsel and
the organization account owner must approve the final public documents.

## Prepared source artifacts

- [x] Privacy-notice approval draft: `docs/legal/PRIVACY-NOTICE-DRAFT.md`
- [x] Controller/processor DPA approval draft: `docs/legal/DATA-PROCESSING-ADDENDUM-DRAFT.md`
- [x] Deployment-specific subprocessor register: `docs/legal/SUBPROCESSOR-REGISTER.md`
- [x] Android/iOS background-location and biometric store disclosure:
  `docs/legal/BACKGROUND-LOCATION-AND-BIOMETRICS-DISCLOSURE.md`
- [x] Native release identity is `DeltCRM` / `com.deltcrm.employee` on Android
  and iOS; `pnpm release:mobile:check` enforces it.
- [ ] Replace all bracketed legal/deployment values and obtain signed approvals.
- [ ] Publish privacy, subprocessor and account-deletion URLs.
- [ ] Attach Play Console and App Store Connect review/approval evidence.

## Data disclosures

- Identify controller/processor roles, subprocessors, hosting regions, support
  access, cross-border transfers, incident notification, and DPA contacts.
- Enumerate account, employment, device, attendance, IP, precise/background
  location, selfie/face result, audit, billing, notification, and diagnostics data.
- Publish purpose, lawful basis/consent, retention period, access/correction/
  deletion process, legal-hold exceptions, and complaint/contact channels.
- Confirm DeltCRM never stores raw card/bank credentials and identify Razorpay or
  Stripe as the payment processor actually enabled for the deployment.

## Background location and biometrics

- Request location only when the tenant policy enables field tracking and the
  authenticated employee is eligible; provide foreground-only behavior otherwise.
- Explain persistent notification, interval, battery impact, start/stop control,
  business purpose, raw-ping retention, and HR visibility before permission.
- Selfie/face permission and enrollment must be separate, revocable consent.
  The employee app must hide these capabilities when the tenant policy disables them.
- Store private evidence in encrypted object storage; expose only short signed
  URLs; test churn/deletion evidence before release.

## Store submission

- Android: Data Safety, background location declaration/video, Play Integrity,
  account deletion URL, privacy URL, target SDK, signing, closed-track test.
- iOS: privacy nutrition labels, location usage strings, biometric purpose,
  account deletion path, App Attest/device checks, signing and TestFlight review.
- Capture store listing/version, reviewer notes, permission screenshots, approval
  links, and final binary hashes in `SPRINT-8-RELEASE-EVIDENCE.md`.

Android store bundles must be built with `-PstoreRelease=true` and the four
`DELTCRM_UPLOAD_*` Gradle properties. The build fails closed if that flag is used
without an upload key; local debug/release artifacts are not store evidence.
