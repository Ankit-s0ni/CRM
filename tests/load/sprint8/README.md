# Sprint 8 GA load gates

Run against a production-like, isolated environment using real seeded users.
`ACCESS_TOKEN` must match the endpoint: use an employee token for punch/sync,
an employee token with an active field session for pings, and an HR or Business
Admin token with field/report permissions for reports/live-board. Run each
profile with the matching token rather than reusing one token for all five.

```bash
export BASE_URL=https://staging-api.example.com
export TENANT_ID=...
export ACCESS_TOKEN=...
export DEVICE_UUID=...
export ATTESTATION_TOKEN=...
export FIELD_SESSION_ID=...

pnpm load:sprint8:punch
pnpm load:sprint8:sync
pnpm load:sprint8:pings
pnpm load:sprint8:reports
pnpm load:sprint8:live-board
```

Archive the k6 version, environment/release, data volume, command, summary, and
threshold result in the release evidence folder. A failed threshold blocks GA;
do not relax budgets without an approved capacity review.
