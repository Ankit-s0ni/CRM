# Tenant Dashboard Role Model

## Decision

The tenant application has one shared dashboard route, `/app`, based on Stitch screen H1 (`5291fecb1e7e42bd8d4a59d9c55d0d0d`). It is not split into separate Business Admin and HR applications.

Business Admin and HR Admin see the same attendance operations foundation. Additional cards and actions are rendered from persisted permissions, not from duplicated pages or role-name checks.

## Current-State Gap

- The tenant navbar links Dashboard to `/app`.
- `/app` currently redirects to `/app/employees`, so no tenant dashboard is implemented.
- H1 exists in Stitch as `HR Dashboard / Live Board` and is the visual source for the shared dashboard.
- Sprint 4 already owns H1 and the attendance records needed to calculate its live values.
- Login currently persists no roles or permissions in the web auth store. `/auth/me` returns both and must hydrate the shell before permission-scoped dashboard content is enabled.

The Dashboard navbar item must not be marked delivered until `/app` renders the real H1-backed screen and its API/state tests pass.

## Shared H1 Foundation

Business Admin and HR Admin can see these widgets when they hold the associated attendance read permissions:

- Present, late, absent, on-field, on-break and not-yet-in KPIs
- Live employee cards/list with department, office, status and check-in time
- Department and status filters plus grid/list view
- Last-updated/live connection indicator
- Needs-attention counts for regularizations, security violations and absentee alerts
- Links to attendance register, employee attendance detail and permitted queues

No KPI may be fabricated from employee configuration data. Until Sprint 4 attendance reads exist, the UI must show an honest loading, empty or unavailable state.

## Business Admin Additions

Business Admin receives the shared H1 foundation because the system role contains all tenant permissions. The owner-only overview is gated by `workspace.dashboard.admin.read`, which is not granted to HR Admin. Its underlying calls remain independently permission-protected:

| Addition | Permission/source | Delivery |
|---|---|---|
| Employee usage and seat/quota warning | `organization.employees.read`; `GET /employees/quota` | Sprint 4 dashboard |
| Workspace setup/configuration health | workspace settings and attendance configuration read permissions | Sprint 4 dashboard |
| Users and roles attention/action | identity user/role permissions | Sprint 4 dashboard |
| Enabled modules | `workspace.modules.read`; `GET /workspace/modules` | Sprint 4 dashboard |
| Plan, invoices, payment warning | billing read permissions | Sprint 8 enhancement |

HR Admin does not receive billing cards or billing deep links. A custom role receives only widgets for which its persisted permissions authorize both the data and destination route.

## API Composition

### Sprint 4 live endpoint

`GET /attendance/dashboard`

Query:

- `date`: optional tenant-local ISO date, default today
- `departmentId`: optional tenant UUID
- `status`: optional repeatable dashboard status filter
- `search`: optional employee name/code search, maximum 100 characters
- `limit`: default 24, maximum 100
- `cursor`: optional stable pagination cursor

Response:

```json
{
  "data": {
    "date": "2026-07-17",
    "timezone": "Asia/Muscat",
    "summary": {
      "present": 142,
      "late": 11,
      "absent": 9,
      "onField": 34,
      "onBreak": 6,
      "notYetIn": 18
    },
    "employees": [],
    "attention": {
      "pendingRegularizations": 3,
      "openSecurityViolations": 2,
      "absenteeAlerts": 5
    },
    "updatedAt": "2026-07-17T08:30:04.000Z",
    "nextCursor": null
  }
}
```

The endpoint requires `attendance.records.read`. Manager/self dashboards remain separate future scopes because their employee visibility and KPI denominators differ.

### Business additions

The web client composes existing permission-safe endpoints instead of introducing one privileged mega-response. Billing data is requested only after billing permissions are hydrated and Sprint 8 endpoints exist.

## Web Rules

- `/app` is the canonical tenant landing page after completed onboarding.
- H1 composition and assets come from Stitch; the existing tenant shell is reused.
- Role names may label the user, but permissions decide widget visibility and available actions.
- `/auth/me` hydrates current roles and permissions after login/rehydration.
- A widget is hidden when its permission is absent; a failed authorized request shows a local error state without hiding the rest of the dashboard.
- Desktop, tablet and mobile layouts preserve the KPI hierarchy and Needs Attention content without horizontal page overflow.

## Acceptance Checklist

- [ ] `/app` no longer redirects to Employees
- [ ] Business Admin and HR Admin both receive the shared live board
- [ ] HR Admin cannot see or request billing data
- [ ] Business Admin sees quota, setup and access additions when authorized
- [ ] Custom-role widgets follow permissions rather than hard-coded role names
- [ ] KPI values come from the Sprint 4 attendance read model
- [ ] Loading, empty, error, forbidden, suspended and stale-live states are covered
- [ ] Stitch comparison passes at 2560x2048 plus supported responsive widths
- [ ] API tests cover tenant isolation and HR/business/custom permission matrices
- [ ] Playwright tests cover both Business Admin and HR Admin sessions
