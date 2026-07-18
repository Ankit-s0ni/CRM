# Sprint 6 Production Provider and Certification Record

**Last reviewed:** July 18, 2026  
**Scope:** Work package 6.0  
**Release status:** Not certified for production

This record separates implemented provider boundaries from commercial, legal and physical-device approvals. A configured adapter is not production certification.

## 1. Provider Decisions

| Boundary | Decision | Region and residency | Retention | Failure policy | Current evidence |
| --- | --- | --- | --- | --- | --- |
| Android integrity | Google Play Integrity Standard requests, native Android SDK `1.6.0` | Google processing terms apply; tenant attendance data is not sent, only opaque evidence and a nonce hash | Raw Google payload is not stored; challenge records are removed 7 days after expiry | Fail closed with `VERIFICATION_PROVIDER_UNAVAILABLE`; never accept a client verdict | Native bridge compiles; one-time tenant/device challenge, atomic consume and replay tests pass. Production gateway decode and physical-device runs remain pending |
| iOS integrity | Apple App Attest, native `DeviceCheck` framework | Apple processing terms apply; tenant attendance data is not sent, only opaque attestation/assertion evidence | Raw Apple payload is not stored; key ID and assertion counter must be retained by the verification gateway | Fail closed; a new App Attest key requires registration before assertions are accepted | Native bridge and production entitlement compile. Gateway key registration, counter validation and physical-device runs remain pending |
| Maps | OpenStreetMap tiles through Leaflet on H2/H3 and `flutter_map` on M16; deterministic in-repo adapter for CI | OSM public tiles do not require a client key; employee route coordinates remain served only by authenticated CRM APIs | Browsers honor normal tile cache headers; release mobile builds use flutter_map's built-in cache. CRM raw pings remain 90 days and route paths are anonymized after retention | Tile failure renders the map shell safely; deterministic adapter supports CI. Use a compliant OSM-compatible hosted/self-hosted tile service before high-volume rollout | Runtime map layers, geofences, markers, routes, OSM attribution and real captured mobile location implemented. Real-device/map-network smoke test remains pending |
| Private evidence storage | S3-compatible private object storage | Production vendor and Gulf-region bucket are not selected | Enrollment objects are queued for deletion on withdrawal/reset; failed jobs are retained for recovery | Presign/read fail closed. Deletion uses durable outbox routing, exponential retries and retained failed jobs | Encryption/private-network/lifecycle infrastructure proof remains pending |
| Face/liveness | **Decision pending** | Provider must offer an approved Gulf-region or legally approved transfer path | Raw selfies must follow the consent policy and deletion SLA; provider payloads must not be logged | Timeout/unavailable fails closed and offers the non-biometric policy path where allowed | Production enrollment calls the HTTPS liveness gateway and stores only a provider-issued opaque enrollment reference. No vendor is approved and production use is prohibited until the certification matrix passes |

## 2. Required Deployment Configuration

| Component | Required configuration |
| --- | --- |
| Integrity gateway | `DEVICE_INTEGRITY_PROVIDER_URL` (HTTPS), `DEVICE_INTEGRITY_PROVIDER_TOKEN`, gateway-side Google decode credentials and Apple App Attest key/counter store |
| Face liveness gateway | `FACE_LIVENESS_PROVIDER_URL` (HTTPS), `FACE_LIVENESS_PROVIDER_TOKEN`, provider-side access to the private object store and a Gulf-region/DPA-approved deployment |
| Android | `PLAY_INTEGRITY_CLOUD_PROJECT_NUMBER`, release signing, final application ID and Play Console linkage |
| iOS | Final bundle ID, App Attest production entitlement, release provisioning and App Store capability |
| Maps | `NEXT_PUBLIC_FIELD_MAP_PROVIDER=openstreetmap`; public OSM tiles for MVP with attribution and a compliant hosted/self-hosted OSM-compatible tile endpoint planned before high-volume rollout |
| Storage | Gulf-region endpoint/bucket, TLS, server-side encryption, private network endpoint, versioning policy and lifecycle rules |
| Proxy/IP | Exact `TRUSTED_PROXIES` load-balancer CIDRs; trust-all ranges are rejected at startup |

The API now fails at production startup when access/refresh secrets are placeholders, the private evidence store is not explicitly configured over HTTPS, or `DEVICE_INTEGRITY_ENFORCEMENT_ENABLED=true` without a valid HTTPS gateway URL and non-placeholder gateway token. `BIOMETRICS_ENFORCEMENT_ENABLED` remains false by default; when enabled, startup requires both HTTPS liveness and face-match gateways with non-placeholder tokens, and policies cannot require face matching while the flag is off. These are configuration safeguards, not substitutes for the certification matrix below.

Secrets must come from the deployment secret manager. They must not be committed or embedded in mobile binaries, except the domain/application-restricted browser map key and Google cloud project number, which are public identifiers.

## 3. Data and Privacy Rules

- Device providers receive opaque platform evidence, challenge hash, action and device binding. They do not receive employee names, coordinates, selfie keys or attendance history.
- Provider verdict payloads are reduced to bounded booleans. Raw provider responses are not persisted or logged.
- Private object keys remain tenant/employee prefixed. Presigned URLs expire after five minutes for upload and one minute for read.
- Consent withdrawal and HR face reset commit revocation first, then dispatch durable deletion. Storage outages do not reactivate biometric use.
- Raw field pings are retained for 90 days. Summary paths/stops/gaps are anonymized after that boundary while non-location audit totals remain.

## 4. Certification Matrix

| Gate | Owner | Status | Evidence required before completion |
| --- | --- | --- | --- |
| Google integrity gateway | Backend/security | In progress | Valid, tampered, rooted, replayed and provider-outage fixtures |
| Apple App Attest gateway | Backend/security | In progress | Initial attestation, valid assertion, tampered assertion, replay/counter and outage fixtures |
| Face/liveness vendor | Product/legal/security | Blocked on decision | Gulf-region availability, DPA, match/mismatch/presentation/timeout and deletion tests |
| OpenStreetMap deployment | Web/DevOps | In progress | OSM attribution and tile-usage-policy review, plus H2/H3/M16 real-device network smoke test; select hosted/self-hosted tiles before high-volume rollout |
| Private storage | DevOps/security | In progress | Encryption, private endpoint, lifecycle, outage/retry/dead-letter/recovery and deletion-SLA proof |
| Office proxy/IP | DevOps/backend | In progress | Environment load-balancer CIDRs plus direct/proxied IPv4, IPv6/CIDR and forged-header deployment tests |
| Legal approval | Legal/security | Not started | Biometric DPA, consent, regional transfer, deletion SLA and incident process approval |
| Physical devices | Mobile/QA | Not started | Supported Android/iOS registration, attestation, enrollment, online/offline punch and outage matrix |

## 5. Release Rule

Production biometric and native-attestation enforcement must remain disabled until every certification row is complete. Development tokens are accepted only when the API is not running with `NODE_ENV=production`; production has no deterministic fallback.
