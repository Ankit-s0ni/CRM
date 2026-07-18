# Sprint 8 GA Release Evidence

Create one immutable copy per release and replace every `PENDING` with a link,
timestamp, owner, and PASS/FAIL result. Repository implementation is not proof
that an external or infrastructure exercise happened.

| Gate | Required evidence | Status |
|---|---|---|
| API/web/mobile builds | CI run, release SHA, signed artifacts | PENDING |
| Database migrations | deploy log and rollback decision | PENDING |
| Billing journey | signup through paid GST invoice and recovery | LOCAL PASS - connected PostgreSQL e2e |
| Security scan/SBOM | dependency, secret, SAST and SBOM artifacts | LOCAL PARTIAL - SAST/CI artifact pending |
| External penetration test | report and closure proof for critical/high findings | EXTERNAL PENDING |
| Backup/PITR | backup checksum, restore log, measured RPO/RTO | INFRASTRUCTURE PENDING |
| Retention/partitions | before/after audit output | LOCAL PASS |
| Load | five k6 summaries with all thresholds passing | ENVIRONMENT PENDING |
| Provider outage/dunning | drill timeline and reconciled audit IDs | LOCAL PASS |
| Monitoring | Sentry issue test, OTel trace, alert receipt | INFRASTRUCTURE PENDING |
| Privacy/store | approved disclosures and store review links | EXTERNAL PENDING |
| Rollback | deployment rollback rehearsal and owner | PENDING |

## Repository verification - July 18, 2026

These results prove the repository-owned implementation locally. They do not
replace signed CI artifacts or the external and production-environment gates
above.

| Check | Result |
|---|---|
| API lint, typecheck and production build | PASS |
| API unit tests | PASS - 50 suites, 255 tests |
| Sprint 8 billing GA PostgreSQL e2e | PASS - 1 suite, 5 tests, including connected signup-to-paid-invoice journey |
| Auth, billing and tenant-deletion PostgreSQL e2e | PASS - final combined run: 3 suites, 7 tests |
| Sprint 8 responsive Playwright flows | PASS - 8 tests at 1440/1024 widths |
| Web lint, typecheck and production build | PASS - 53 routes built |
| Flutter analyze, tests and release web build | PASS |
| Native DeltCRM mobile identity and permission disclosure check | PASS - `com.deltcrm.employee` on Android/iOS |
| Android native package/Gradle verification | PASS - debug APK built after package move |
| Correlated Sentry/OTel/on-call drill tooling | PASS - implementation and focused tests; real receipt pending |
| OpenAPI export/client generation | PASS - 189 paths, 236 operations |
| Repository secret and database-boundary scan | PASS |
| Production dependency audit | PASS - no known vulnerabilities |
| Retention/partition audit | PASS - 15 partitions, zero pending expired rows |
| Local PostgreSQL backup/checksum smoke | PASS |
| Formal SBOM | PASS - `artifacts/sbom/deltcrm.cdx.json`, CycloneDX 1.6, 699 components |
| SBOM checksum | PASS - `artifacts/sbom/deltcrm.cdx.json.sha256` |
| Local restore drill | PASS - PostgreSQL 18 client to PostgreSQL 16 disposable database, 1 second |
| Partition boundary audit | PASS - all production parents/defaults and month-edge routing |
| Provider transport outage | PASS - failed transaction, dunning, dual audit and recovery e2e |
| Local k6 smoke | PASS - punch 70.2 ms, sync 52.6 ms, reports 33.1 ms p95; 0% failures |
| Managed backup restore/PITR with measured RPO/RTO | INFRASTRUCTURE PENDING |
| Production-like k6 for all five profiles | ENVIRONMENT PENDING |

The machine-readable gate manifest is
`artifacts/release/sprint8-ga-evidence.json`. Run
`pnpm release:evidence:validate` during development and
`pnpm release:evidence:check` for the final go/no-go decision. The strict command
must fail while any required gate or frozen release identity remains pending.

Engineering drafts now exist for the privacy notice, DPA, subprocessor register,
and background-location/biometric store disclosure under `docs/legal/`. They are
not publication or store-approval evidence until their approval tables and the
gate manifest reference signed decisions.

The observability gate specification and correlated drill command are in
`docs/SPRINT-8-OBSERVABILITY-GATE.md`. A local/unit PASS proves payload safety,
deduplication and delivery handling only; the monitoring gate remains pending
until one real `drillId` is verified in Sentry, OTel and the on-call destination.

Detailed local evidence: `docs/SPRINT-8-LOCAL-DRILL-REPORT.md`.

## Release decision

- Release/version:
- Git SHA:
- Environment:
- Decision owner:
- Approved at:
- Known accepted risks and expiry:
- Rollback version and database compatibility:
