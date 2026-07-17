# UI Screen Inventory & Google Stitch Prompts

## Multi-Tenant HRMS — Attendance Module (Web Portals + Flutter Employee App)

**How to use this file:** Each screen has a numbered ID, the portal it belongs to, and a ready-to-paste Stitch prompt. Always paste the GLOBAL STYLE PREAMBLE first (or prepend it to each prompt) so all screens come out visually consistent. Generate web screens with Stitch's "Web" mode and Flutter app screens with "Mobile" mode.

---

## GLOBAL STYLE PREAMBLE (prepend to every prompt)

> Design system: modern enterprise SaaS, clean and professional. Primary color deep indigo (#4F46E5), success green (#16A34A), warning amber (#D97706), danger red (#DC2626), neutral slate grays. Font: Inter. 8px spacing grid, 12px card radius, subtle shadows, generous whitespace. Light mode. Web screens: left sidebar navigation with company logo at top, top bar with global search, notification bell, and user avatar menu. Mobile screens: bottom tab navigation, large touch targets, thumb-friendly primary actions. Use realistic Indian company sample data (employee names, Muscat/Oman offices, OMR currency).

# SCREEN INVENTORY (summary table)

| #       | Portal               | Screen                                                                                                                                                                                                                                                                                                      |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1–A5  | Shared Auth (web)    | Login, Signup, Email verify, Forgot/Reset password, Workspace not found                                                                                                                                                                                                                                     |
| S1–S11 | Super Admin (web)    | Dashboard, Tenants list, Tenant detail, Create tenant, Plans, Plan editor, Invoices, Invoice detail, Modules, Global audit logs, System health                                                                                                                                                              |
| B1–B10 | Business Admin (web) | Onboarding wizard, Company settings, Org builder, Employees list, Employee form, Bulk import, Roles & users, Role editor, Master attendance policies, Billing & subscription                                                                                                                                |
| H1–H16 | HR Portal (web)      | Dashboard/live board, Live field map, Route playback, Office locations & geofence editor, Attendance policies, Shifts, Roster planner, Holidays, Attendance register, Employee attendance detail, Regularization queue, Regularization detail, Exceptions, Security violations, Reports center, Muster roll |
| M1–M20 | Flutter Employee App | Splash, Login, Device registration, Biometric consent, Face enrollment, Home/Today, Check-in camera, Verifying, Punch success, Punch failure, Break, Attendance history, Day detail, Regularization form, My requests, Field tracking, Offline sync, Notifications, Profile, Settings                       |
| L1–L3  | Leave (both)         | Leave balances (app), Apply leave (app), Leave approvals (HR web)                                                                                                                                                                                                                                           |

**Total: 65 screens** (5 auth + 11 super admin + 10 business admin + 16 HR + 20 mobile + 3 leave)

---

# PART A — SHARED AUTH (Web)

### A1. Tenant Login

> Web login page for a B2B SaaS HRMS at subdomain "acme.hrmsapp.com". Centered card on soft gradient background. Company logo placeholder at top, workspace name "Acme Industries". Email and password fields, "Remember me" checkbox, "Forgot password?" link, large indigo "Sign in" button. Below: "Not your workspace? Switch company" link. Footer with product name and legal links. Error state variant: red inline banner "Invalid email or password".

### A2. Self-Serve Registration (public signup)

> Public signup page for businesses registering for an HRMS SaaS. Two-column layout: left side marketing panel with product illustration and 3 benefit bullets (hardware-free attendance, GPS + face verification, instant setup); right side form: company name, work email, password, choose subdomain field with live preview "yourcompany.hrmsapp.com", employee count dropdown, "Create workspace" button, terms checkbox. Step indicator showing "1 of 2 — Verify email next".

### A3. Email Verification

> Minimal centered card: envelope illustration, heading "Verify your email", text "We sent a 6-digit code to admin@acme.com", 6 individual OTP input boxes, "Verify" button, "Resend code (0:42)" countdown link, "Change email" link.

### A4. Forgot / Reset Password

> Two states in one flow. State 1: centered card, email field, "Send reset link" button. State 2 (reset): new password + confirm password fields with strength meter, requirements checklist (8+ chars, number, symbol), "Reset password" button, success toast variant.

### A5. Workspace Not Found / Suspended

> Friendly error page: illustration of a locked office door, heading "This workspace is unavailable", body text explaining the subdomain doesn't exist or the account is suspended for billing, two buttons: "Contact support" (primary) and "Go to main site" (ghost). Small "Error code: TENANT_SUSPENDED" caption.

---

# PART S — SUPER ADMIN PANEL (Platform Owner, Web)

### S1. Platform Dashboard

> Super admin dashboard for a multi-tenant SaaS. Top row: 4 KPI cards — MRR ₹4.2L (+12%), Active tenants 87, Total employees 12,450, Failed payments 3 (red accent). Middle: line chart "Revenue last 12 months" and donut chart "Tenants by plan (Basic/Pro/Enterprise)". Bottom: two panels side by side — "Recent signups" table (company, plan, date, status chip) and "System health" list with green/amber status dots (API latency, GPS ingestion queue, payment gateway, push delivery). Sidebar nav: Dashboard, Tenants, Plans, Billing, Modules, Audit Logs, Health.

### S2. Tenants List

> Data table page "Tenants". Toolbar: search box, filters for status (Trial/Active/Suspended/Churned) and plan, "+ Create Tenant" primary button. Table columns: company name with logo avatar, subdomain, plan chip, employees used vs limit (progress bar "142/200"), MRR, status chip, created date, row kebab menu (View, Impersonate, Suspend). Pagination footer. One row shows amber "Past due" badge.

### S3. Tenant Detail

> Tenant detail page for "Acme Industries" with header showing logo, subdomain link, status chip "Active", and buttons "Impersonate Admin" (with shield icon) and "Suspend". Tab bar: Overview, Subscription, Modules, Invoices, Audit Trail. Overview tab visible: info cards (plan, seats used 142/200 with progress, next billing date, timezone), usage sparkline "daily active employees", danger zone card at bottom with "Suspend tenant" and "Schedule deletion" actions. Include a slim amber banner example: "Impersonation session active — acting as admin@acme.com (ends in 28:14)".

### S4. Create Tenant (manual onboarding)

> Modal-style form over dimmed tenant list: "Create new tenant". Fields: company name, subdomain with availability check (green tick), admin email, temporary password with generate button, plan dropdown, employee limit, checkbox "Send credentials email". Primary button "Create & send invite". Side note panel: "The Business Admin will be prompted to change password on first login."

### S5. Subscription Plans

> Grid of 3 plan cards (Basic Attendance ₹49/user/mo, Pro + Field Tracking ₹99, Enterprise custom) each showing price, max employees, feature checklist (face verification, field GPS, offline sync, API access), tenant count on plan, Edit button. "+ New plan" dashed card. Toggle at top: Monthly/Yearly pricing view.

### S6. Plan Editor

> Form page "Edit plan — Pro". Left column: name, price per user, billing period, max employees, status toggle (active/archived). Right column: "Included modules" checklist with toggles (Attendance, Field Tracking, Leave, Payroll — last two locked with "coming soon" tag), feature flags list. Sticky footer bar with "Save changes" and warning text "Changes apply to new subscriptions only".

### S7. Invoices & Billing Overview

> Billing operations page. Top KPIs: Collected this month ₹3.8L, Outstanding ₹42K, Dunning 5 tenants. Table of invoices: invoice #, tenant, amount, due date, status chip (Paid/Open/Past due/Uncollectible), gateway (Stripe/Razorpay logo), actions (View, Retry charge). Filter chips above table. Right side panel: "Dunning queue" list showing tenants with failed payments, retry countdowns, and "Suspend now" buttons.

### S8. Invoice Detail

> Invoice detail drawer/page: header "INV-2026-0091 — Acme Industries — ₹14,200 — Past due" with red chip. Line items table (Pro plan × 142 users). Payment attempts timeline: 3 entries with timestamps, gateway reference IDs, failure reason "card_declined", one pending retry. Buttons: "Retry charge", "Mark as paid", "Send reminder email", "Void".

### S9. Module Management

> Two-panel page. Left: "Module registry" list (Attendance ✓ live, Leave ✓ live, Field Tracking ✓ live, Payroll — beta, CRM — locked) with add-module button. Right: matrix table of tenants × modules with toggle switches per cell, search for tenant, bulk action "Enable for all Pro tenants". Confirmation modal example: "Enable Field Tracking for Acme Industries?"

### S10. Global Audit Logs

> Full-width log explorer. Filter bar: date range picker, tenant dropdown, actor search, module dropdown, action type. Table rows: timestamp, tenant, actor (with impersonation badge where relevant), action ("attendance_policy.updated"), module, expandable row showing old→new JSON diff side by side with red/green highlighting, IP address, request ID. Export CSV button.

### S11. System Health & Alerts

> Observability page: status cards for API, Worker queue, Ping ingestion (with "lag: 3s"), Face-match provider, Payment gateway, Push delivery — each with uptime %, latency sparkline, green/amber/red dot. Below: "Active alerts" list (amber: "GPS ingestion lag > 30s for 5 min", red example resolved) and "Alert rules" table with thresholds and notification channels (email/Slack).

---

# PART B — BUSINESS ADMIN DASHBOARD (Client Master Console, Web)

### B1. Onboarding Wizard (first login)

> Full-screen 4-step wizard, progress stepper at top: 1 Company profile, 2 Working days, 3 Verification rules, 4 Invite HR. Step 1 visible: upload company logo dropzone with preview "appears on your employees' app", company name, industry dropdown, timezone selector with search, primary office city. Buttons: "Skip for now" ghost, "Continue" primary. Clean, welcoming, illustration on the right side.

### B2. Company Settings

> Settings page with left sub-nav (Profile, Working days, Security, Branding). Main panel "Working days": weekly grid of day chips Mon–Sun with Mon–Fri selected, special rule row "2nd & 4th Saturday off" toggle, timezone display, standard hours 9:00–18:00 pickers. Save bar. Branding section preview: phone mockup thumbnail showing where the logo appears in the employee app.

### B3. Department & Designation Builder

> Two-panel org structure page. Left: expandable tree "Acme Industries > Sales > Field Executives; Operations > Warehouse; Engineering" with drag handles, add-child buttons, employee counts per node. Right: selected node detail — name field, parent dropdown, designations chip list within the department (Field Executive, Area Manager) with add-chip input, member preview avatars. "+ Department" and "+ Designation" buttons.

### B4. Employees List

> Employee directory table. Toolbar: search, filters (department, work type Office/Field/Hybrid, status Active/On notice/Terminated), "+ Add employee" and "Import CSV" buttons, quota banner at top: amber "190 of 200 seats used — 95% of your plan limit. Upgrade plan". Columns: avatar + name + employee code, department, designation, work type chip, manager, face enrolled (✓/– icon), device registered (✓/–), status chip, kebab menu.

### B5. Employee Create/Edit

> Employee form page in 3 sections: Personal (name, employee code auto-suggested, email, phone), Organization (department tree-select, designation, manager type-ahead, work type radio Office/Field/Hybrid, date of joining, default shift dropdown), Verification (master selfie upload with circular crop preview and lock note "employees cannot change this photo", face enrollment status, registered device card showing "Pixel 7 — Active" with Block button). Save/Cancel sticky footer.

### B6. Bulk Import (CSV)

> Import wizard, 3 steps: Upload (dropzone, "Download template" link), Map columns (two-column mapping UI with auto-matched green rows and one amber unmatched), Review (summary "148 rows valid, 4 errors" with error table: row number, field, message "duplicate employee_code EMP-042", download error report button). "Import 148 employees" primary button, background-job note "You'll be notified when it completes".

### B7. Users & Roles

> Access control page. Top: users table (name, email, roles chips like "Business Admin", "HR Manager", status, last login, kebab). "Invite user" button opens side drawer: email, role multi-select with descriptions ("HR Manager — operational HR access, no billing"), send invite. Below: roles summary cards (Business Admin 2 users, HR Manager 4, Team Lead 12, Employee 190) each with "Edit permissions" link.

### B8. Role Editor (permission matrix)

> Permission matrix page "Edit role: HR Manager". Grouped permission rows by module (Attendance, Organization, Reports, Billing) each with toggle switches: attendance:policy:manage ✓, attendance:regularization:approve ✓, org:employee:manage ✓, billing:manage ✗ (locked with tooltip "Business Admin only"). Right rail: role summary, member count, "Duplicate role" and "Delete role" actions. Unsaved-changes sticky bar.

### B9. Master Attendance & Security Policies

> Policy console. Card 1 "Biometric verification": large master toggle "Require facial recognition", when-on sub-settings visible: strictness slider 70–99 with marker at 85 and captions Lenient/Balanced/Strict, liveness check toggle. Card 2 "Device rules": require registered device toggle, allow device change requests toggle. Card 3 "Location rules": require geofence for office staff toggle, note linking to HR portal for geofence drawing. Each card has "applies to: All departments" scope selector. Save bar with "These are tenant-wide defaults; HR can create department overrides."

### B10. Billing & Subscription

> Tenant-side billing page. Plan card: "Pro Plan — ₹99/user/month — 190/200 seats" with usage progress bar and "Upgrade plan" button. Payment method card: Visa •••• 4242 with change button. Invoices table: month, amount, status, download PDF icon. Right rail: next invoice preview "₹18,810 on Aug 1" and quota warning example "You've reached 95% of your employee limit."

---

# PART H — TENANT OPERATIONS (Business Admin + HR Admin, Web)

### H1. Shared Workspace Dashboard / Live Attendance Board

> Real-time HR dashboard. Top KPI strip: Present 142, Late 11 (amber), Absent 9 (red), On field 34, On break 6, Not yet in 18. Main: live grid of employee cards (avatar, name, department, status chip Clocked In/On Break/On Field/Absent, check-in time, small location tag "HQ — Bengaluru") with live-updating pulse dot, filter chips by department and status, view toggle grid/list. Right rail: "Needs attention" feed — 3 pending regularizations, 2 security violations, 5 absentee alerts after 10:00 AM grace with "Notify" buttons. Auto-refresh indicator "Live • updated 4s ago".

> Role variants: this is the canonical `/app` dashboard for both Business Admin and HR Admin. Business Admin sees the same operational board plus permission-gated workspace setup, employee quota, users/roles and enabled-module cards. Billing/plan additions appear only for users with billing read permissions after B10 is delivered. HR Admin never sees or requests billing data. Custom roles receive widgets from persisted permissions rather than hard-coded role names.

### H2. Live Field Map

> Full-bleed map view (Bengaluru) with sidebar. Map shows numbered avatar pins for 12 active field employees, clustered where dense; one selected pin opens a popover card: photo, name, "Last ping 2 min ago", battery 64%, speed/idle tag, buttons "View route" and "Call". Sidebar list of field staff with search, status dot (live/stale >15min/offline), last ping time, battery icon. Top bar: department filter, "Show geofences" toggle displaying translucent circles around offices.

### H3. Route Playback

> Route playback screen for one employee's day. Map with polyline route from 9:14 to 17:40, numbered stop markers with dwell times ("Stop 3 — Client site, 42 min"), start/end flags. Bottom: timeline scrubber with play/pause, speed 1x/4x/10x, time labels, and ping density bars. Side panel: day summary — distance 38.4 km, stops 6, tracking gaps 1 (amber segment on map, "offline 22 min"), punch events overlaid as diamonds on scrubber.

### H4. Office Locations & Geofence Editor

> Geo-fence configuration page. Left: interactive map with a draggable pin on an office and a circular radius overlay with drag handle; radius field "150 m" synced to the circle. Right form: office name "HQ — Indiranagar", address search box, latitude/longitude readouts, radius slider 50–500m, timezone dropdown, "Office network IPs" repeater rows (203.0.113.42/32) with add/remove and helper text "punches from these IPs are auto-approved for office staff", assigned-employees count with manage link. Offices list table below with edit/delete. "+ Add office" button.

### H5. Attendance Policies (HR level)

> Policy list + editor. Left: policy cards (Default Office Policy, Field Staff Policy, Night Shift Policy) each with assignment scope tag "3 departments". Right editor for selected policy in sections: Lateness (late after 15 min, half-day after 240 min, min work 480 min, overtime after 540 min — all steppers), Punch rules (allow early check-in toggle, allow early checkout toggle), Verification (require face match, require registered device, require geofence toggles), Offline (max offline sync window 48h stepper). Assignment section: department multi-select and employee-override search. Save bar with "Changes apply from tomorrow; past days are never recalculated."

### H6. Shifts Management

> Shifts page. Table of shifts: name, time range with mini 24h bar visualization (Day 9:00–18:00, Evening 14:00–23:00, Night 22:00–06:00 with "overnight" moon badge spanning past midnight), assigned employees count, edit/delete. "+ New shift" drawer: name, start/end time pickers, overnight auto-detected note "ends next day", preview bar. Info callout: "Lateness rules come from the attendance policy, not the shift."

### H7. Roster Planner

> Weekly roster calendar. Left: employee list grouped by department with search. Main: week grid (Mon–Sun columns) with colored shift blocks per employee cell (blue Day, purple Evening, dark Night, gray Weekly Off), drag-to-assign interaction hint, empty cells showing faint "default: Day". Toolbar: week switcher, department filter, "Bulk assign" button opening modal (select employees, shift, date range, skip holidays checkbox), "Copy last week", CSV import link. Conflict example: red-outlined cell tooltip "overlaps approved leave".

### H8. Holiday Calendar

> Holidays page: year calendar heat view at top highlighting holiday dates, table below: date, name (Republic Day, Holi, Diwali), scope chip (All offices / Mumbai only), created by. "+ Add holiday" modal: name, date, scope radio (tenant-wide / specific office dropdown). Import national-holidays preset button.

### H9. Attendance Register (daily/period list)

> Attendance records explorer. Filter bar: date range, department, status multi-select, work type. Table: employee, date, first in / last out, total hours, late minutes (amber text when >0), OT minutes, break minutes, status chip (Present/Half Day/Absent/On Leave/Holiday/WFH), verification icons row (face ✓, geo ✓, device ✓), source icon (mobile/web), lock icon on payroll-locked rows, row click hint. Bulk export button. Summary footer: totals row.

### H10. Employee Attendance Detail (timeline + month)

> Single-employee attendance page. Header: avatar, name, code, department, policy and shift tags. Left: month mini-calendar with color-coded days (green present, amber half, red absent, blue leave, gray off) and month totals card (worked 176h, late 4 days, OT 6.5h). Right: selected-day vertical timeline — 9:12 Check-in (face ✓ geo ✓, selfie thumbnail, map pin thumbnail), 13:00 Break start, 13:32 Break end, 18:45 Check-out; offline-synced event shows cloud icon with "synced 2h later"; regularized event shows purple "REGULARIZED" tag with approver. Buttons: "Add exception", "Regularize".

### H11. Regularization Queue

> Approvals inbox. Tabs: Pending 7, Approved, Rejected. Card list: each request shows employee avatar/name, date concerned, requested change "Check-out 18:00 (missing punch)", reason quote "Phone battery died", evidence chips (last GPS 17:52 near office), age "2 days", quick Approve / Reject buttons and open-detail. Bulk-select checkboxes with bulk approve. SLA note chip "3 requests older than 48h" in amber.

### H12. Regularization Detail

> Split view. Left: request info — employee, date, current log timeline showing the gap highlighted in red dashed outline, requested values diff (before/after times), employee reason, attachment placeholder. Right: decision panel — manager comments textarea, radio Approve/Reject, on-approve preview card "Recomputed: total 8h 47m, status Present (was Missing punch)", audit note "synthetic REGULARIZED_CHECKOUT event will be appended", confirm button. History timeline of the request at bottom.

### H13. Exceptions Management (OD / WFH)

> Exceptions page. Table: employee, type chip (On Duty/WFH/Other), date range, reason, source (Manual/Leave module), approved by, actions. "+ Add exception" drawer: employee search, type, date range picker, reason, note "these days won't be marked Absent". Calendar strip preview of the affected days.

### H14. Security Violations Feed

> Security monitoring page. Filter chips: Mock location, Face mismatch, Outside geofence, Blocked device, Clock tampering. Feed cards: red-left-border card "Rahul S. attempted check-in 2.1 km outside HQ geofence — 9:04 AM" with small map thumbnail showing attempt pin vs geofence circle, face-mismatch card with match score 41% vs threshold 85%, mock-location card with device model. Each card: employee link, "View verification log" and "Block device" actions. Trend mini-chart top-right "violations this month".

### H15. Reports Center

> Reports hub. Card grid: Muster Roll, Payroll Export, Late & Overtime, Security Violations, Field Distance — each with description and "Generate" button opening a config modal (month picker, department filter, format CSV/XLSX). Below: "Recent exports" table — report, period, requested by, status chip (Running with spinner/Completed/Failed), file size, download icon, expiry note "links valid 7 days".

### H16. Muster Roll

> Classic monthly muster grid. Sticky first column: employee name + code. Columns: days 1–31 with weekend shading and holiday markers; cells show compact codes with colors: P (green), A (red), HD (amber), L (blue), H (gray), WO (light gray), OD (teal); today column highlighted. Right summary columns: Present days, LOP, OT hours. Toolbar: month switcher, department filter, legend row, "Export for payroll" primary button with lock icon note "exporting locks the month".

---

# PART M — FLUTTER EMPLOYEE APP (Mobile)

### M1. Splash / App Launch

> Mobile splash screen: centered tenant company logo (Acme Industries) with subtle scale animation frame, app name small at bottom "Powered by HRMS", indigo progress dots, clean white background. Below-logo status text variant: "Checking session…".

### M2. Login

> Mobile login screen: company logo top, workspace name "Acme Industries", email/phone field, password field with visibility toggle, "Sign in" full-width indigo button, "Forgot password?" link, footer note "Contact HR if you don't have credentials". Error variant snackbar "Invalid credentials". Keyboard-aware layout.

### M3. Device Registration / Binding

> Mobile screen after first login: shield illustration, heading "Register this device", explainer "Attendance punches are only allowed from your registered device", card showing detected device "Pixel 7 • Android 15" with device ID snippet, "Register device" primary button, secondary note "Need to switch phones later? HR approval required." Pending-approval variant with amber clock icon "Waiting for HR approval".

### M4. Biometric Consent

> Mobile consent screen: friendly face-scan illustration, heading "Face verification consent", scrollable consent text card summarizing what's collected (a face template from your photo), how it's used (attendance verification only), retention (deleted when you leave), checkbox "I agree to biometric verification", version tag "Policy v1.2", buttons "Give consent" primary and "Decline — use GPS only" text button with note "your admin will be notified".

### M5. Face Enrollment

> Mobile camera enrollment screen: full-screen front-camera preview with oval face guide overlay, instruction chip cycling "Center your face → Blink slowly → Hold still", progress ring around oval at 60%, bottom sheet: "This becomes your locked verification photo. It cannot be changed later." Capture button disabled until liveness passes (shown greyed with lock icon), success variant with green ring and checkmark.

### M6. Home / Today Screen

> Employee app home tab. Top: greeting "Good morning, Priya", date, shift chip "Day Shift 9:00–18:00", location status pill "Inside office zone ✓" (green). Center: large circular CHECK IN button (indigo, 180px) with subtle pulse. Below: today timeline card — empty state "No punches yet"; filled variant: 9:12 in, break 13:00–13:32, live counter "Working: 4h 26m". Bottom tabs: Home, Attendance, Requests, Alerts, Profile. Offline banner variant at top: gray "You're offline — punches will sync later".

### M7. Check-In Camera (liveness)

> Full-screen selfie verification: front camera feed, oval guide, top progress steps as dots (Face → Blink → Capturing), dynamic instruction "Blink now", corner chip showing GPS lock icon ✓ and accuracy "±8m", cancel X top-left, no manual shutter (auto-capture), bottom caption "Verifying it's really you — takes ~3 seconds". Low-light warning variant toast "Move to better lighting".

### M8. Verifying (in-flight)

> Interstitial mobile screen: captured selfie thumbnail in circle, animated progress checklist with items resolving one by one — Device ✓, Security check ✓, Location ✓, Face match (spinner) — indigo linear progress bar, caption "Do not close the app". Skeleton shimmer styling.

### M9. Punch Success

> Success screen: large green animated checkmark, "Checked in at 9:12 AM", detail rows with icons: HQ — Indiranagar ✓ inside zone, Face match ✓, Device ✓; shift info "Day shift — you're 12 min early"; confetti subtle; "Done" button returning home; small link "View today's timeline". Checked-OUT variant: total hours summary card "Worked 8h 47m today • OT 0h 17m".

### M10. Punch Failure (error states)

> Mobile error screen set (one screen, show 4 stacked variant cards): 1) OUTSIDE_GEOFENCE — red map pin illustration, "You're 2.1 km from the office", mini-map with your pin vs office circle, buttons "Retry" and "Request regularization"; 2) FACE_MISMATCH — "Face didn't match (score below threshold)", tips list (remove mask, better light), "Try again (2 attempts left)"; 3) MOCK_LOCATION — amber shield, "Fake GPS detected — disable mock location apps", link "How to fix"; 4) DEVICE_NOT_REGISTERED — "This isn't your registered device", "Contact HR" button. Each card has an error code caption.

### M11. Break Start/End

> Bottom sheet over home screen: "Take a break?" with big Start Break amber button, note "Break time may be unpaid per policy". On-break home variant: circular button becomes "END BREAK" amber with elapsed timer ring "0:14:22", timeline shows open break entry.

### M12. Attendance History (month)

> Attendance tab: month switcher header, calendar grid with colored day dots (green/amber/red/blue/gray legend below), monthly summary card: Present 21, Half-day 1, Absent 1, Leave 2, Late 3 times, OT 5h 30m. Below calendar: scrollable day list rows (date, in–out times, hours, status chip). Tap-day hint. Payroll-locked month shows small lock icon on header.

### M13. Day Detail

> Day detail screen for July 8: status chip Present, hours summary row (worked 8h 12m, late 6m amber, break 30m). Vertical timeline: check-in 9:21 with selfie thumbnail + map snippet + verification icons; break pair; check-out 18:03; offline-synced badge on one event "saved offline • synced 14:02". Footer buttons: "Request correction" and "Report an issue".

### M14. Regularization Request Form

> Mobile form: context card showing the problem day "July 5 — Missing check-out" with red gap in a mini timeline, requested check-in (prefilled, disabled) and requested check-out time picker, reason dropdown (Battery died, Forgot to punch, Device issue, Other) + free-text, optional photo attachment tile, policy note "Requests allowed within 7 days", submit button "Send to manager". Success sheet: "Request sent to Anil (Manager)".

### M15. My Requests

> Requests tab with segmented control: Regularizations / Leave. List cards: date, type, requested change summary, status chip (Pending amber with "waiting 1 day", Approved green with approver name and timestamp, Rejected red with manager comment preview "Please apply leave instead"), chevron to detail. Empty state illustration "No requests yet". Pull-to-refresh indicator.

### M16. Field Tracking Status

> Field-staff screen: map card with my live location and today's breadcrumb trail, big status toggle card "Field tracking: ON since 9:14" with green pulse, stats row: pings today 34, distance 21.6 km, battery impact "Low", next ping countdown "in 9 min". Info rows: "Pings every 15 min during shift", "Tracking stops automatically at check-out". Battery-saver warning variant: amber card "Battery optimization is restricting tracking — tap to fix" with settings deep-link button.

### M17. Offline Sync Queue

> Sync status screen: header card "3 punches waiting to sync" with cloud-off icon, list items: event type + time "Check-in • 9:12 AM" with clock-saved badge and retry count, connectivity status row "No internet — will retry automatically", manual "Sync now" button (disabled offline), success state variant: green banner "All punches synced ✓ 2 min ago" with empty-state illustration. Tamper note small print: "Punch times are verified against server clock on sync."

### M18. Notifications

> Notifications tab: grouped list Today/Earlier. Items with leading icons: green check "Your regularization for Jul 5 was approved by Anil", indigo bell "Shift reminder — your shift ends in 15 min", teal location "You've entered the office zone — don't forget to check in!", gray cloud "Offline punch synced successfully", amber alert "You were marked late today (21 min)". Unread dot indicators, swipe-to-read hint, mark-all-read text button, empty state variant.

### M19. Profile

> Profile tab: header with locked profile photo (small lock badge, tooltip note "Photo managed by HR for verification"), name, employee code, department & designation, manager row. Cards: My shift (Day 9:00–18:00), My office (HQ — Indiranagar, 150m zone), Registered device (Pixel 7 • Active, "Request device change" link), Face verification (Enrolled ✓ Jan 2026, consent v1.2 with "Withdraw consent" link). Sign out button bottom.

### M20. Settings & Permissions

> Settings screen: grouped list — Permissions section with status rows and fix buttons: Camera ✓, Location "Always" ✓, Notifications ✓, Battery optimization ⚠ "Restricted — tap to allow"; Preferences: language selector, punch reminder toggles (check-in nudge, checkout reminder 15 min before shift end); About: app version, privacy policy, licenses. Danger zone: "Unregister this device" with confirm dialog variant.

---

# PART L — LEAVE (minimal v1 screens)

### L1. Leave Balances (mobile)

> Leave tab in employee app: balance cards row — Casual 6.5 days, Sick 4, Earned 12.5 — each with donut of used/remaining, accrual note "1.5 days added on Aug 1". Below: upcoming approved leave card and "Apply for leave" primary button. History list with status chips.

### L2. Apply Leave (mobile)

> Mobile leave form: leave type selector cards with remaining balance badges, date range calendar picker highlighting selected span with weekend/holiday auto-excluded note "3 working days will be deducted", half-day toggle for start/end, reason textarea, balance-after preview "Casual: 6.5 → 3.5", submit "Send for approval". Insufficient-balance error variant inline.

### L3. Leave Approvals (HR web)

> HR web approvals page mirroring regularization queue: pending leave cards with employee, type chip, date range, days count, balance check indicator (green "sufficient" / red "exceeds by 1"), overlap warning "2 others from Sales on leave these dates", reason, Approve/Reject with comment. Calendar heat strip at top showing team coverage for the month. Approved leaves auto-create attendance exceptions — shown as an info footnote.

---

# GENERATION TIPS FOR STITCH

1. **One screen per prompt.** Paste the global preamble + one screen prompt. Stitch loses coherence when asked for multiple screens at once.
2. **Generate variants as follow-ups**: after the base screen, prompt "show the empty state" / "show the error state" rather than packing them into one image.
3. **Web vs Mobile mode**: A/S/B/H/L3 screens → Web (desktop, 1440px); M/L1/L2 screens → Mobile (390px).
4. **Consistency trick**: generate S1 (dashboard) and M6 (home) first, then reference them: "match the visual style of the previous screen" in the same Stitch project.
5. **Export order**: Stitch exports to Figma / HTML+Tailwind. For web, its Tailwind output maps cleanly onto the Next.js + shadcn/ui stack; treat it as a visual reference and rebuild components with shadcn primitives rather than pasting generated markup. For Flutter, use the designs as reference only — implement with your own widget library per FLUTTER-RIVERPOD-MOBILE-APP.md.
6. **Screens intentionally not designed** (system-generated or trivial): email templates, PDF invoice/report layouts, OS permission dialogs, push-notification payloads. Handle these in build, not design.
