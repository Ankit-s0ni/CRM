# Sprint 6 load tests

The profiles require a running API and real seeded tenant credentials. They do
not contain fallback identities or trust evidence.

```bash
export BASE_URL=http://127.0.0.1:4001
export ACCESS_TOKEN=...
export TENANT_ID=...
export FIELD_SESSION_ID=...
export DEVICE_UUID=...
export ATTESTATION_TOKEN=...

pnpm load:sprint6:pings
pnpm load:sprint6:sync
pnpm load:sprint6:sse
```

The ping and sync profiles use standard k6. SSE requires a k6 binary built with
the `k6/x/sse` extension. Keep the thresholds in source control; tune only the
arrival rate, connection count, duration and VU capacity through environment
variables. Capture the command, k6 version, target environment, thresholds and
summary output as release evidence.
