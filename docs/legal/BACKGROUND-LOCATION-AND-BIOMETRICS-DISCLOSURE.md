# DeltCRM Mobile Permission and Store Disclosure

**Status:** Engineering-complete draft; legal and store approval pending  
**App identity:** DeltCRM / `com.deltcrm.employee`

## Background-location justification

DeltCRM uses background location only for employees assigned to an active field
attendance policy. During a user-started field session, periodic coordinates
allow the employer to verify that work occurred within assigned areas, maintain
route/visit evidence and detect a missing field check-out while the app is
minimized. Office-only users and tenants that disable field tracking do not see
field controls and are not asked for background location.

The app explains the purpose before the operating-system prompt, displays active
tracking state, allows the employee to end the field session, and stops scheduled
capture at check-out/session expiry. Signing in alone never starts tracking.
Raw pings have a 90-day engineering retention default and are removed by audited
retention jobs; the approved customer/legal schedule may shorten this period.

## Store reviewer demonstration

1. Sign in to a test tenant with `FIELD_TRACKING` licensed and enabled.
2. Use an employee assigned to an eligible field/hybrid policy.
3. Open Field Tracking and review the pre-permission purpose, interval and stop behavior.
4. Start a field session, grant foreground then background location, minimize the app and show the persistent Android service notification or iOS location indicator.
5. Return to the app, stop/check out, and demonstrate that scheduled capture ends.
6. Sign in to an office-only fixture and demonstrate that no background-location prompt or field navigation is shown.

Store submission must attach a recording of these steps, the approved privacy
URL, retention text, reviewer credentials and the precise feature path.

## Camera, selfie and face verification

Camera access is requested only when the tenant's attendance policy requires a
selfie or face check. Face enrollment has a separate consent screen and is not a
condition for tenants/policies that use location-only or manual attendance.
Employees can review consent state; revocation disables biometric eligibility
and starts the approved private-evidence deletion flow subject to legal hold.

Private images are uploaded to restricted object storage using short-lived
signed operations. The primary database stores references and verification
results, not reusable raw payment or device secrets. Production face/liveness
enforcement remains disabled until the selected provider, region, DPA, deletion
SLA and physical-device certification are approved.

## Platform permission strings

- Android: precise/approximate location, background location, foreground
  location service, camera and notifications are declared in the manifest.
- iOS: when-in-use, always/background, temporary precise-location and camera
  purpose strings describe attendance and active field-session behavior.
- Runtime: tenant capabilities determine whether each permission is relevant;
  denied permissions produce a recoverable state rather than silent collection.

## Approval and submission evidence

| Gate | Owner | Evidence | Status |
|---|---|---|---|
| Privacy/legal wording | `[OWNER]` | `[APPROVAL LINK]` | PENDING |
| Android Data Safety and background-location declaration | `[OWNER]` | `[PLAY CONSOLE LINK]` | PENDING |
| iOS privacy labels and permission review | `[OWNER]` | `[APP STORE CONNECT LINK]` | PENDING |
| Closed-track/TestFlight physical-device test | `[OWNER]` | `[TEST REPORT]` | PENDING |
| Published privacy and account-deletion URLs | `[OWNER]` | `[URLS]` | PENDING |
