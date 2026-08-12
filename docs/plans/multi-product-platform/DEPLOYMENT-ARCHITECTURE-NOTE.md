# Delsia Deployment Architecture Note

## Purpose

This note explains how Platform, HRMS, the local development gateway, and
production `nginx` fit together, and how the architecture expands later when
Mail, POS, and more products are added.

The short version is:

- local development uses a gateway so we can test multi-product routing on one
  host
- production uses `nginx` at the public edge
- `nginx` forwards to the internal gateway or routing layer
- Platform remains the control plane
- each product remains an independent runtime with its own API, web, workers,
  database, storage, and jobs

## Customer Workspace URLs

Each customer uses one workspace subdomain. For example:

```text
https://acme.blufield.cloud/login
https://acme.blufield.cloud/en/app
https://acme.blufield.cloud/en/app/hrms
```

This is one shared multi-tenant deployment, not one application deployment per
customer. Platform resolves `acme` to an immutable tenant ID and all product
tokens and product records use that tenant ID.

Production requires:

- wildcard DNS `*.blufield.cloud` pointing to the public edge
- a wildcard TLS certificate for `*.blufield.cloud`
- `nginx` preserving the original `Host` and forwarded scheme/IP headers
- a reserved-subdomain list for `www`, `api`, `platform`, `platformapi`,
  `hrmsapi`, and future infrastructure names
- a controlled workspace-unavailable response for unknown, suspended, or
  deleted tenants

## Local Development Flow

Local development is for fast iteration and integration testing.

### Local entry points

- gateway: `http://localhost:4080`
- Platform API: `http://localhost:4011`
- Platform web: `http://localhost:4022`
- HRMS API: `http://localhost:4012`
- HRMS web: `http://localhost:4023`

### Local request flow

1. Browser opens `http://localhost:4080`
2. Gateway receives the request
3. Gateway routes shell/app traffic to Platform web
4. Gateway routes product traffic like `/en/app/hrms` to HRMS web
5. Gateway routes product API traffic to the correct product API
6. Platform issues product tokens
7. HRMS validates the Platform-issued token and serves the request

### Why the local gateway exists

- one local URL for the full workspace experience
- easy testing of locale-aware routes
- easy testing of product handoff from Platform to HRMS
- easier future testing when Mail and POS are added
- keeps local integration behavior closer to production behavior

## Production Flow

Production should use `nginx` as the public edge entry point.

### Production edge responsibilities

`nginx` should own:

- TLS termination
- public DNS/domain routing
- HTTP to HTTPS redirect
- request size, buffering, timeout, gzip, and cache headers
- forwarded headers like host, scheme, client IP, and request ID
- websocket or streaming proxy settings when needed

### Production request flow

1. Customer opens the public domain
2. `nginx` receives the request
3. `nginx` forwards to the internal gateway or gateway-like routing layer
4. Gateway decides whether the request belongs to:
   - Platform web
   - Platform API
   - HRMS web
   - HRMS API
   - future Mail web/API
   - future POS web/API
5. Platform handles authentication and control-plane decisions
6. Product APIs validate Platform-issued product tokens and enforce product permissions

## Recommended Production Shape

The recommended production shape is:

```text
Internet
  ->
nginx
  ->
gateway / routing layer
  ->
Platform services + Product services
```

### Simple mental model

- `nginx` is the front gate
- gateway is the internal traffic manager
- Platform is the control tower
- HRMS, Mail, and POS are independent buildings behind that control tower

## Where Each Part Sits

### Platform

Platform should own:

- signup/login/session/JWKS
- tenant/workspace lifecycle
- product registry
- plans and pricing
- subscriptions
- entitlements
- billing
- global roles and permission assignment
- shell navigation and unified app launcher

### HRMS

HRMS should own:

- employees
- attendance
- leave
- device trust
- field tracking
- documents
- payroll
- HRMS mobile app
- HRMS database and migrations
- HRMS worker for exports, HRMS outbox publication, scheduled privacy
  retention, and future long-running HRMS jobs

### Gateway

Gateway should own:

- product-aware path routing
- locale-aware route forwarding
- product app handoff
- consistent internal routing conventions

Gateway should not become the business logic layer.

### Nginx

`nginx` should own:

- public entry
- SSL/TLS
- reverse proxy edge behavior
- static proxy hardening
- edge reliability concerns

## Future Mail And POS Expansion

When Mail and POS are added, the production architecture should not need a big redesign.

### What changes

- add a Mail product manifest
- add a POS product manifest
- register their audiences, permissions, capabilities, and routes in Platform
- add Mail and POS upstreams behind gateway
- attach those products to plans and entitlements in Platform

### What does not change

- `nginx` remains the public edge
- Platform remains the control plane
- products remain independently deployable
- gateway remains the product traffic router

That is what makes this architecture scalable.

## Background Worker Ownership

Workers follow the same ownership boundary as APIs and databases:

- `platform-worker` owns Platform notification delivery and billing/dunning
- `hrms-worker` owns HRMS report generation, HRMS outbox publication, and field
  tracking retention
- future `mail-worker` owns mail delivery/import/indexing jobs
- future `pos-worker` owns POS synchronization and settlement jobs

The legacy monolith worker must not be retained as a hidden dependency after
cutover. A separated worker reads only its product database. Shared Redis is a
transport for versioned events; it is not a shared source of business data.

### Required HRMS production processes

```text
hrms-api       node dist/src/hrms-main
hrms-worker    node dist/src/hrms-worker
hrms-web       Next.js production server
```

The HRMS worker currently performs:

- tenant-scoped CSV report generation and private-object upload
- signed private report download support through the API
- idempotent HRMS outbox relay to domain and Platform notification queues
- retry, lease recovery, and dead-letter state for failed outbox events
- scheduled field-tracking privacy retention

Run the HRMS database migration before starting the worker. Under PM2 use the
repository `ecosystem.config.cjs`; under containers run one or more instances
of `pnpm --filter api start:worker:prod`.

## Why Not Use Only Nginx For Everything

It is possible to encode all routing inside `nginx`, but that becomes harder to
maintain when:

- products increase
- locale-aware routes increase
- product-specific handoff logic increases
- shell-to-product transitions increase
- deep links and app launch rules increase

Using `nginx` only at the edge and keeping a product-aware gateway/routing layer
behind it is cleaner for a multi-product suite.

## Deployment Implication For Our Next Step

For deployment, we should treat the server work in this order:

1. inspect the currently deployed legacy CRM stack
2. identify how it is running
   - Docker
   - PM2
   - systemd
   - direct Node processes
   - existing `nginx` vhost config
3. back up current runtime config and database connection details
4. stop and remove only the legacy CRM runtime pieces we no longer need
5. deploy Platform and HRMS as separate services
6. place `nginx` in front of them
7. wire domain routing, health checks, and restart policies
8. run smoke tests for:
   - Platform login
   - product token issuance
   - HRMS launch from Platform
   - product API routing
   - localized routes
   - workspace wildcard routing (`acme.blufield.cloud`)
   - report moves from `PENDING` to `COMPLETED` and downloads via signed URL
   - HRMS outbox backlog drains and failed jobs remain visible

## Important Rule For Server Cleanup

We should not delete anything on the EC2 instance until we first capture:

- active processes
- docker containers and images
- nginx config
- environment files
- deploy directories
- current bound ports
- systemd or PM2 services

That gives us a rollback path before removing the legacy CRM deployment.
