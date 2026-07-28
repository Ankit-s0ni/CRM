# Transactional Mail Service Implementation Plan

## 1. Purpose

**Status:** Proposed
**Selected provider:** Self-hosted Mailcow
**Primary owners:** Backend developer, DevOps, Product/Design
**Exit outcome:** Password reset, workspace invitations, employee invitations, and security emails are delivered through a production email provider with tenant-safe links, bilingual templates, retries, auditability, and bounce handling.

This plan covers transactional product email only. Marketing campaigns, newsletters, mailbox hosting, and inbound support email are outside this scope.

## 2. Current Implementation Findings

| Area                  | Current state                                                                            | Gap                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Provider abstraction  | `EmailNotificationPort` and `ConfiguredEmailNotificationAdapter` exist                   | Adapter only posts plain text to a custom `EMAIL_GATEWAY_URL`; no real provider is implemented in this repository |
| Development fallback  | Missing gateway returns a `dev:<email>` provider reference                               | It can appear successful even though no email was sent                                                            |
| Production validation | Requires HTTPS `EMAIL_GATEWAY_URL` and `EMAIL_GATEWAY_TOKEN`                             | No gateway deployment or provider configuration is present                                                        |
| Email verification    | Verification-code generation and sending exist                                           | Login enforcement is intentionally disabled because the product currently does not require email verification     |
| Forgot password       | Secure reset token creation, consumption, password hashing, and session revocation exist | The reset link is never emailed                                                                                   |
| User invitations      | Invite token creation, acceptance, expiry, and role assignment exist                     | Create/resend does not send an invitation email                                                                   |
| Notification delivery | Notification templates, preferences, deliveries, and retry infrastructure exist          | It is not the canonical sender for all identity emails                                                            |
| Localization          | Tenant English/Arabic localization exists                                                | Transactional email templates are not integrated with it                                                          |

The project therefore has useful foundations, but mail delivery is **not production-ready**.

## 3. Product Decisions

### 3.1 Provider

Use **Mailcow as the self-hosted mail platform** and connect the API to it through authenticated SMTP. Keep `EmailNotificationPort` so business services remain independent of SMTP and Mailcow.

Implementation:

- Add `nodemailer` and its TypeScript types to the API.
- Create `SmtpEmailNotificationAdapter`.
- Use authenticated SMTP submission on port `587` with STARTTLS.
- Create a dedicated Mailcow mailbox/service account for the CRM sender.
- Use a Mailcow app password for the application instead of a human mailbox password.
- Require certificate validation; do not set `rejectUnauthorized: false` in production.
- Keep a development adapter that writes email previews to logs or a local mail catcher.
- Do not silently report a production email as sent when SMTP is not configured.
- Remove `EMAIL_GATEWAY_URL` and `EMAIL_GATEWAY_TOKEN` after SMTP is active, or retain the HTTP adapter only as an explicitly selected alternative.

Suggested application configuration:

```env
MAIL_ENABLED=true
MAIL_PROVIDER=smtp
SMTP_HOST=mail.blufield.cloud
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USERNAME=crm-system@blufield.cloud
SMTP_PASSWORD=<mailcow-app-password>
MAIL_FROM_ADDRESS=no-reply@blufield.cloud
MAIL_FROM_NAME=DeltCRM
MAIL_REPLY_TO=support@blufield.cloud
MAIL_BOUNCE_ADDRESS=bounces@blufield.cloud
PUBLIC_BASE_DOMAIN=blufield.cloud
```

`SMTP_SECURE=false` with port `587` means the connection starts normally and is upgraded using STARTTLS. Port `465` with implicit TLS is an acceptable alternative, but the project must use one documented configuration consistently.

### 3.2 Mail server placement

Run Mailcow on a **dedicated VM with a dedicated static public IP** if possible. Do not colocate it with the CRM API/web server unless capacity and port conflicts have been explicitly resolved.

Reasons:

- Mailcow is a complete groupware stack and documents a minimum of 6 GiB RAM plus 1 GiB swap and 20 GiB disk before mailbox data.
- Mailcow normally binds SMTP ports `25`, `465`, and `587`, IMAP ports, and HTTP/HTTPS ports `80` and `443`.
- The CRM server already uses Nginx and ports `80`/`443`.
- Mail delivery reputation, backups, upgrades, and outages should be isolated from the CRM application.

Recommended host:

```text
mail.blufield.cloud -> dedicated mail server public IP
```

If the existing CRM server must be used temporarily:

- Confirm at least 8 GiB available RAM after the CRM workload.
- Bind Mailcow HTTP/HTTPS to non-conflicting local ports and proxy `mail.blufield.cloud` through the existing Nginx.
- Keep SMTP submission and inbound SMTP ports dedicated to Mailcow.
- Verify Docker networks do not overlap with existing services.
- Test CPU, memory, disk I/O, and restart behavior under load.
- Document that a CRM or Mailcow deployment must not restart or replace the other stack.

### 3.3 Signup verification

- Keep signup email verification disabled for now, as previously decided.
- Do not display "verify your email" steps or block login.
- Retain the underlying token capability so verification can be enabled later through a documented feature flag.
- Forgot-password and invitation emails remain required even when signup verification is disabled.

### 3.4 Tenant-safe links

Every email link must use the intended tenant host:

```text
https://{tenant-subdomain}.blufield.cloud/reset-password?token=...
https://{tenant-subdomain}.blufield.cloud/invitation/accept?token=...
```

Rules:

- Resolve the tenant subdomain on the server from `tenantId`; never trust a host supplied by the client.
- Use one canonical `PUBLIC_BASE_DOMAIN=blufield.cloud`.
- Use HTTPS in production.
- Preserve locale in links where appropriate: `/en/...` or `/ar/...`.
- Never generate production links using `localhost`, `app.your-domain.com`, or a query-only workspace fallback.

## 4. What Is Needed

### 4.1 Infrastructure and server access

The business/DevOps owner must provide:

- A dedicated VM or an explicitly approved shared-server deployment.
- A static public IPv4 address; IPv6 should be configured only when reverse DNS and routing are correct.
- Root/administrative access to install and maintain Mailcow.
- A supported Linux host, Docker, and Docker Compose.
- At least the Mailcow minimum resources, with additional disk for mailbox growth and backups.
- DNS access for `blufield.cloud`.
- The mail hostname `mail.blufield.cloud`.
- Provider-controlled reverse DNS/PTR for the public IP pointing to `mail.blufield.cloud`.
- Confirmation that inbound and outbound SMTP traffic is permitted by the hosting provider.
- A valid TLS certificate for the mail hostname.
- The mail domain `blufield.cloud` configured in Mailcow.
- A dedicated CRM SMTP mailbox/service account and app password.
- A sender such as `no-reply@blufield.cloud`.
- A monitored reply/support address such as `support@blufield.cloud`.
- A monitored `postmaster@blufield.cloud` mailbox.
- A monitored DMARC-report mailbox.
- A dedicated bounce mailbox or documented bounce-processing route.
- Off-server encrypted backups and restore-test ownership.
- Monitoring for Mailcow containers, SMTP queue, disk, RAM, certificates, blacklists, and delivery failures.

### 4.2 DNS and sender reputation

Configure:

- `A` record for `mail.blufield.cloud`.
- `MX` record for `blufield.cloud` pointing to `mail.blufield.cloud`.
- Matching PTR/reverse DNS for the server IP.
- SPF authorizing the Mailcow host/IP.
- DKIM generated in Mailcow and published in DNS.
- DMARC, initially monitored with `p=none`, then tightened after delivery is stable.
- `autodiscover` and `autoconfig` records if human mailboxes will use Mailcow.
- Optional SMTP submission SRV records.

Mailcow requires correct DNS and recommends matching forward and reverse DNS plus SPF, DKIM, and DMARC. See the official Mailcow guidance for [system requirements and ports](https://docs.mailcow.email/getstarted/prerequisite-system/), [DNS configuration](https://docs.mailcow.email/getstarted/prerequisite-dns/), and [SMTP client configuration](https://docs.mailcow.email/client/client-manual/).

### 4.3 Network ports

Required public ports depend on whether Mailcow will host full mailboxes or only application mail:

|       Port | Purpose                                     | Requirement                                            |
| ---------: | ------------------------------------------- | ------------------------------------------------------ |
|   `25/tcp` | Server-to-server SMTP                       | Required inbound and outbound                          |
|  `587/tcp` | Authenticated SMTP submission with STARTTLS | Required for the CRM API                               |
|  `465/tcp` | SMTP over implicit TLS                      | Optional if port 587 is used                           |
|   `80/tcp` | ACME/HTTP redirect                          | Required unless DNS challenge or reverse proxy is used |
|  `443/tcp` | Mailcow UI/SOGo/API                         | Required for administration                            |
|  `993/tcp` | IMAPS                                       | Required if mailboxes are accessed over IMAP           |
| `4190/tcp` | ManageSieve                                 | Optional                                               |

Do not allow unauthenticated relay from the public internet. Mailcow warns that incorrect trusted-network configuration can create an open relay and damage sender reputation. The CRM should authenticate with its dedicated SMTP account instead of expanding `mynetworks`.

### 4.4 Product content

Product/Design must approve:

- DeltCRM logo and email-safe brand colors.
- English and Arabic subject lines and body copy.
- Support contact details.
- Legal footer, privacy link, and security wording.
- Token expiry wording.
- Whether tenant logos/names appear in employee-facing emails.

## 5. Required Email Catalogue

### Phase 1: Required for a usable account system

| Template                           | Recipient             | Trigger                            | Primary action                     |
| ---------------------------------- | --------------------- | ---------------------------------- | ---------------------------------- |
| Password reset                     | Any user              | Forgot-password request            | Reset password                     |
| Password changed                   | User                  | Successful reset/change            | Review account or contact support  |
| Workspace administrator invitation | Invited admin/manager | Invitation create/resend           | Accept invitation and set password |
| Employee app invitation            | Employee              | Account enable/invitation          | Activate account and set password  |
| Invitation revoked/expired         | Invited user          | Revocation or expired-link attempt | Contact workspace admin            |

### Phase 2: Recommended security and operations

| Template                           | Recipient          | Trigger                                 |
| ---------------------------------- | ------------------ | --------------------------------------- |
| New device registration request    | Employee and/or HR | Mobile device registration              |
| Device approved/rejected           | Employee           | HR decision                             |
| Account locked                     | User               | Login lockout threshold                 |
| Role/access changed                | Administrator      | Elevated permission change              |
| Leave request/decision             | Employee/approver  | Leave workflow                          |
| Attendance regularization decision | Employee           | HR approval/rejection                   |
| Critical security violation        | Configured admins  | High-severity attendance/security event |

Do not implement payroll, marketing, or bulk-announcement mail as part of Phase 1.

## 6. Application Architecture

### 6.1 Email message contract

Expand the provider contract from plain text to a structured message:

```ts
type EmailMessage = {
  to: Array<{ email: string; name?: string }>;
  from?: { email: string; name: string };
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  templateKey: string;
  tenantId?: string;
  locale: "en" | "ar";
  tags: Record<string, string>;
  idempotencyKey: string;
};
```

Requirements:

- Always send both HTML and plain-text bodies.
- Escape all user and tenant supplied values.
- Do not allow templates to inject arbitrary scripts or remote HTML.
- Add stable tags for environment, template, tenant, and message type.
- Store the SMTP/Postfix queue ID against the delivery record when available.

### 6.2 Template system

Create versioned application-owned templates rather than constructing strings inside auth services.

Suggested structure:

```text
apps/api/src/platform/notifications/templates/
  password-reset/
    en.ts
    ar.ts
  password-changed/
    en.ts
    ar.ts
  user-invitation/
    en.ts
    ar.ts
  shared/
    layout.ts
    text.ts
```

Template rules:

- Resolve recipient language from user preference, then tenant default, then English.
- Use proper `dir="rtl"` and an Arabic-capable font stack for Arabic.
- Regional Arabic overrides may reuse the localization catalogue when approved.
- Keep security-critical wording server-owned and versioned.
- Include tenant name/logo only after validating the asset URL.
- Preview every template in development without sending it.

### 6.3 Transactional email service

Extend `TransactionalEmailPort` with explicit methods:

```ts
sendPasswordReset(...)
sendPasswordChanged(...)
sendUserInvitation(...)
sendInvitationRevoked(...)
```

Business services should request a semantic email and should not know SMTP or Mailcow details.

### 6.4 Queue and retries

Identity endpoints must not wait for SMTP delivery to complete:

1. Create the reset/invitation token transactionally.
2. Create an email outbox/delivery record with a unique idempotency key.
3. Return the generic API response.
4. A worker sends the email.
5. Retry temporary failures with exponential backoff.
6. Mark permanent failures and expose them to administrators.

Do not create a second token on every worker retry. Resend actions must revoke the previous token and create one new token.

Reuse the existing notification-delivery infrastructure where possible. If it cannot guarantee outbox semantics, add a dedicated `TransactionalEmailOutbox` model rather than sending inside a database transaction.

## 7. Flow Changes

### 7.1 Forgot password

Required behavior:

1. User submits email and workspace context.
2. API always returns the same generic response to prevent account enumeration.
3. If the account exists, create a hashed, one-time reset token with a short expiry.
4. Queue a tenant-safe reset link.
5. Reset consumes the token exactly once.
6. Revoke all refresh sessions after password change.
7. Send password-change confirmation.
8. Audit the request and completion without recording the raw token.

Also add:

- Per-IP and per-account rate limiting.
- A resend cooldown.
- Token expiry displayed in the email.
- A clear expired-token screen.
- No `debugResetToken` in production responses or logs.

### 7.2 Invitations

Required behavior:

1. HR/admin creates an invitation.
2. API creates the hashed invitation token and queues an email.
3. Email identifies the tenant, invited role, inviter, and expiry.
4. Acceptance verifies tenant status, role validity, token expiry, and unused state.
5. Resend revokes all previous active invitation tokens.
6. Revoke prevents later acceptance.
7. Admin UI shows `queued`, `sent`, `delivered`, `failed`, `bounced`, or `expired`.

Do not claim "invitation sent" when the message is only queued. Show a delivery failure with a safe resend action.

## 8. Security and Privacy Requirements

- Store only token hashes; raw tokens exist only long enough to construct the link.
- Never log reset/invitation URLs, passwords, or raw tokens.
- Use cryptographically random tokens with one-time consumption and expiry.
- Invalidate older tokens when a new token is issued.
- Rate-limit reset, resend, and invitation endpoints.
- Prevent account and tenant enumeration in public responses.
- Restrict the CRM SMTP account to the required sender identities and sending limits.
- Store the SMTP app password in a protected production secret/environment file, never in source control.
- Rotate the SMTP app password periodically and immediately after suspected exposure.
- Protect the Mailcow administrator account with MFA.
- Restrict the Mailcow administration UI by firewall/VPN where practical.
- Redact email body and sensitive values from application logs.
- Define retention for delivery metadata and provider events.
- Maintain a suppression list for hard bounces and complaints.
- Require administrator confirmation before resending to a suppressed address.

## 9. Observability and Operations

Track:

- Messages queued, sent, delivered, delayed, bounced, complained, and rejected.
- SMTP latency and retry count.
- Delivery rate by template and environment.
- Hard-bounce and complaint rates.
- Queue age and permanently failed jobs.
- Mailcow/Postfix queue depth.
- Mail server disk, memory, CPU, container health, and TLS certificate expiry.
- Public-IP blacklist/reputation status.

SMTP acceptance only means Mailcow queued the message; it does not prove inbox delivery. Store the Postfix queue ID where available and process asynchronous delivery-status notifications from a dedicated bounce mailbox or a controlled Postfix log/event pipeline. Hard bounces and complaint signals must update the internal suppression list.

Operational controls:

- Health check reports provider/configuration readiness without exposing secrets.
- Platform admin can inspect metadata and resend failed transactional messages.
- Alerts fire for queue backlog, Mailcow outage, SMTP authentication failure, disk pressure, certificate expiry, rising bounce rate, or complaints.
- A runbook documents Mailcow outage, SMTP credential failure, DNS/rDNS failure, blacklisting, queue recovery, backup restore, and rollback.
- Schedule Mailcow's supported backup script and copy backups to a different server or object store.
- Perform and document periodic restore tests. A backup that has never been restored is not considered verified.

Mailcow provides `helper-scripts/backup_and_restore.sh` for component or full backups. Follow the official [Mailcow backup guidance](https://docs.mailcow.email/backup_restore/b_n_r-backup/).

## 10. Environment Policy

### Local

- Use a local mail catcher or file/console preview adapter.
- Mark every delivery as `PREVIEWED`, not `SENT`.
- Debug tokens may be exposed only when explicitly enabled.

### Test and staging

- Use a local mail catcher or a separate staging Mailcow domain/mailbox.
- Block delivery to arbitrary external addresses.
- Use staging branding and links.

### Production

- `MAIL_ENABLED=true` and `MAIL_PROVIDER=smtp` are mandatory.
- API startup fails if SMTP host, port, credentials, sender, TLS policy, or base domain is missing.
- API startup performs a safe SMTP connection/authentication verification.
- Debug token exposure is always disabled.
- No silent no-op adapter is allowed.

## 11. Delivery Phases

### Phase 0: Decisions and infrastructure

- Approve dedicated or shared Mailcow server placement and capacity.
- Provision the server, static IP, firewall, Docker, and Mailcow.
- Configure hostname, TLS, A/MX/PTR, SPF, DKIM, and DMARC.
- Create CRM sender, support, postmaster, DMARC, and bounce mailboxes.
- Create and securely store the CRM SMTP app password.
- Configure backups, SMTP queue monitoring, bounce processing, and alarms.
- Test sending and receiving with major mailbox providers before application integration.

### Phase 1: Provider and templates

- Implement SMTP adapter using Nodemailer.
- Expand message contract to HTML/text/metadata.
- Build English and Arabic shared layouts.
- Add local preview adapter.
- Add startup configuration validation.

### Phase 2: Identity flows

- Wire password-reset email.
- Wire password-change confirmation.
- Wire administrator and employee invitations.
- Implement resend/revoke delivery states.
- Remove production debug-token paths.

### Phase 3: Reliability

- Add outbox worker, idempotency, and exponential retries.
- Ingest Mailcow/Postfix bounce and complaint signals.
- Add suppression handling and platform visibility.
- Add dashboards, alerts, and runbook.

### Phase 4: Operational notifications

- Add device, leave, attendance, access-change, and security templates according to product priority.
- Add per-user notification preferences only where the message is not security-critical.

## 12. Testing Strategy

### Unit tests

- Template rendering and HTML escaping.
- Locale fallback and RTL output.
- Tenant URL generation.
- SMTP error classification.
- Token expiry, revocation, and one-time use.
- Generic forgot-password response for known and unknown accounts.

### Integration tests

- Reset request creates one outbox record and does not expose a token.
- Invitation create/resend/revoke produces correct delivery state.
- Retry does not create a new token.
- SMTP/Postfix queue ID is stored when available.
- Bounce/complaint events update the correct delivery and suppression state.

### End-to-end tests

- Password reset from an English tenant subdomain.
- Password reset from an Arabic route and RTL email.
- Employee and elevated-role invitation acceptance.
- Expired, already-used, revoked, and cross-tenant links.
- Mailcow outage followed by successful retry.
- Invalid SMTP credentials and expired certificate behavior.
- Production boot fails when mail configuration is incomplete.

## 13. Acceptance Criteria

The mail service is ready only when:

- Password-reset email reaches a real external inbox and completes the reset.
- Administrator and employee invitation emails reach the correct tenant URL.
- English and Arabic emails render correctly on mobile and desktop clients.
- Production API responses never expose reset or invitation tokens.
- Missing production mail configuration stops startup instead of pretending to send.
- Temporary SMTP errors retry without creating duplicate emails or tokens.
- Hard bounces and complaints are recorded and suppressed.
- Delivery metadata is visible to authorized platform administrators.
- DKIM, SPF, and DMARC alignment pass.
- The server is not an open relay and its PTR matches `mail.blufield.cloud`.
- Off-server backups, restore verification, queue monitoring, and alarms are active.
- The API, web app, and relevant end-to-end tests pass in CI.

## 14. Recommended Implementation Order

1. Provision and secure the Mailcow server.
2. Complete DNS, reverse DNS, TLS, and deliverability prerequisites.
3. Create the dedicated CRM sender account and app password.
4. Implement and verify the SMTP adapter.
5. Add the outbox and delivery state model.
6. Build the shared bilingual template system.
7. Complete forgot-password end to end.
8. Complete administrator and employee invitations.
9. Add bounce ingestion and suppression handling.
10. Add operational emails after the identity flows are stable.

This ordering makes forgot password production-safe first while preserving the current decision not to require signup email verification.
