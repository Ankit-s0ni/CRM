import type { AttendanceHelpEntry } from "./attendance-help";

export type PortalHelpEntry = Omit<AttendanceHelpEntry, "key"> & {
  key: string;
};

const entries: Array<{
  match: (path: string) => boolean;
  entry: PortalHelpEntry;
}> = [
  route(
    "integrations",
    "/app/settings/integrations",
    "Integrations",
    "Check whether deployment-managed services required by DeltCRM are available.",
    "Use this when email, file uploads, face verification, payments, or maps are unavailable.",
    [
      "Review the status of each provider.",
      "Confirm whether an optional provider is intentionally disabled.",
      "Contact DeltCRM platform support when configuration is required.",
    ],
    "This page is read-only and never exposes credentials or creates a fake tenant connection.",
    "Business Admin or authorized workspace administrator",
  ),
  route(
    "notification-preferences",
    "/app/settings/notifications",
    "Notification preferences",
    "Choose how optional DeltCRM notices reach your signed-in account.",
    "Use this when you want to reduce optional email or push notices without disabling required security and decision messages.",
    [
      "Review each notice and its available channels.",
      "Turn optional channels on or off.",
      "Use the inbox link to review delivered in-app notices.",
    ],
    "Changes apply only to your account. Required security and approval-result notices remain enabled.",
    "Any signed-in user with notification access",
  ),
  route(
    "security-settings",
    "/app/settings/security",
    "Security controls",
    "Find device trust, Attendance verification behavior, evidence, and alert rules in one place.",
    "Use this when changing how employee Attendance is trusted or investigating a security event.",
    [
      "Set the required verification behavior.",
      "Review and approve employee devices.",
      "Monitor evidence and resolve alerts with an auditable note.",
    ],
    "These controls can change employee Attendance eligibility and required mobile permissions.",
    "Business Admin or authorized HR/security administrator",
    ["The Attendance module must be enabled"],
  ),
  route(
    "employee-import",
    "/app/employees/import",
    "Employee import",
    "Add or update many employees from a validated CSV job.",
    "Use this for an initial rollout or a controlled bulk employee update.",
    [
      "Download and complete the supported template.",
      "Upload the file and review validation results.",
      "Correct failed rows and retry only the safe failures.",
    ],
    "Successful rows create employee records and lifecycle history; failed rows do not partially apply.",
    "Business Admin or HR with import access",
    ["Departments and designations should already exist"],
  ),
  route(
    "organization",
    "/app/employees/organization",
    "Organization structure",
    "Manage departments, designations, and the structure used for managers, policies, and reports.",
    "Use this before assigning employees or department-scoped policies.",
    [
      "Create the required departments and designations.",
      "Confirm parent departments and reporting structure.",
      "Assign employees from their profile or employee editor.",
    ],
    "Organization changes affect directory filters, manager scope, policy assignment, and reporting.",
    "Business Admin or HR with organization access",
  ),
  route(
    "employee-profile",
    /^\/app\/employees\/[^/]+/,
    "Employee workspace",
    "Manage the complete employee context without jumping between unrelated portal screens.",
    "Use this for onboarding, assignments, account access, Attendance, Leave, trust, or lifecycle review.",
    [
      "Review readiness on Overview.",
      "Resolve office, shift, roster, and policy assignments.",
      "Use module tabs for Attendance and Leave history.",
      "Review devices, biometrics, and audit history before lifecycle actions.",
    ],
    "Changes can affect the employee mobile app, Attendance eligibility, manager scope, and payroll evidence.",
    "Business Admin, HR, permitted managers, or the employee in self scope",
  ),
  route(
    "employees",
    "/app/employees",
    "Employee directory",
    "Find employees and begin every employee lifecycle workflow from one directory.",
    "Use this to search, filter, create, import, or open an employee workspace.",
    [
      "Search by name, code, or phone.",
      "Filter by status, work type, department, or manager.",
      "Open the employee profile for related actions.",
    ],
    "Directory visibility follows your role and reporting scope.",
    "Business Admin, HR, permitted managers, and self-service users",
  ),
  route(
    "leave",
    /^\/app\/(modules\/leave|leave|settings\/leave)/,
    "Leave management",
    "Operate leave requests, approvals, balances, and versioned policies.",
    "Use this to review pending requests or configure leave entitlement.",
    [
      "Configure an active policy.",
      "Confirm employee balances.",
      "Review pending requests and available entitlement.",
      "Approve or reject with a clear comment.",
    ],
    "Approved leave updates the balance ledger and Attendance exception behavior.",
    "Employees, managers, HR, or Business Admin according to scope",
    ["The Leave module must be entitled"],
  ),
  route(
    "payroll",
    /^\/app\/(modules\/payroll|reports\/payroll|settings\/payroll|attendance\/payroll)/,
    "Payroll operations",
    "Generate immutable payroll evidence, verify upstream readiness, and close finalized periods.",
    "Use this after Attendance and approved Leave are complete for the payroll month.",
    [
      "Resolve readiness warnings in Attendance and Leave.",
      "Generate and review the payroll export.",
      "Download the immutable evidence.",
      "Close the period only after validation; reopen only with an audited reason.",
    ],
    "Closing a period prevents Attendance, Leave, and correction changes from silently altering payroll evidence.",
    "Business Admin or authorized payroll and HR users",
    [
      "Payroll and Attendance modules must be entitled",
      "A completed payroll export is required before period close",
    ],
  ),
  route(
    "reports",
    "/app/reports",
    "Report center",
    "Generate reproducible exports and retrieve completed report jobs.",
    "Use this for muster, payroll, late/overtime, violations, or field-distance evidence.",
    [
      "Choose the report and period.",
      "Generate the export and wait for completion.",
      "Download it before the signed link expires.",
    ],
    "Reports use a fixed source snapshot so later changes do not silently rewrite exported evidence.",
    "Users with report read or generation permission",
    ["The relevant module must be entitled"],
  ),
  route(
    "access",
    "/app/settings/access",
    "Users and roles",
    "Control who can enter the workspace and what each role is allowed to do.",
    "Use this when inviting HR users, changing roles, or disabling access.",
    [
      "Review the permission matrix.",
      "Create or update the role with least privilege.",
      "Assign it to the user and verify direct-route access.",
    ],
    "Access changes apply to navigation and API authorization; hiding a menu item is never the security boundary.",
    "Business Admin or authorized HR administrator",
  ),
  route(
    "billing",
    "/app/settings/billing",
    "Billing and subscription",
    "Review plan, seats, invoices, and commercial module access.",
    "Use this when employee limits or module entitlements need review.",
    [
      "Review active plan and seat usage.",
      "Resolve overdue billing or capacity warnings.",
      "Confirm entitled modules after any plan change.",
    ],
    "Commercial changes can enable, restrict, or suspend module access without deleting tenant data.",
    "Business Admin with billing access",
  ),
  route(
    "audit",
    "/app/settings/audit",
    "Audit history",
    "Search attributed administrative changes and review their before/after evidence.",
    "Use this during access reviews, incident investigation, policy verification, or employee lifecycle checks.",
    [
      "Filter by module, action, actor, entity, or date.",
      "Open an entry to review request and change evidence.",
      "Use the request ID to correlate an action with API logs.",
    ],
    "Audit history is read-only and may contain security-sensitive operational metadata.",
    "Business Admin or HR Admin with audit permission",
  ),
  route(
    "settings",
    "/app/settings",
    "Workspace settings",
    "Configure the company, organization, access, modules, policies, security, notifications, and billing from one place.",
    "Use this when changing how the workspace or an entitled module behaves.",
    [
      "Choose the settings category that owns the behavior.",
      "Review dependencies and affected employees.",
      "Save the change and verify the linked operational workflow.",
    ],
    "Settings can affect web access, employee-app controls, Attendance calculation, Leave, security, and billing.",
    "Business Admin or permitted HR administrators",
  ),
  route(
    "modules",
    "/app/modules",
    "Modules",
    "Open the operational workspace for each tool enabled in this tenant.",
    "Use this to enter Attendance, Leave, Payroll, Mail, or future DeltCRM tools.",
    [
      "Review enabled module status.",
      "Open the module for daily work.",
      "Use its setup area for policies and configuration.",
    ],
    "Module visibility depends on both tenant entitlement and your permissions.",
    "Any workspace user with module access",
  ),
  route(
    "dashboard",
    "/app",
    "HR operations dashboard",
    "See workforce status and every authorized queue that needs action.",
    "Start here at the beginning of an HR or manager work session.",
    [
      "Review workforce and Attendance status.",
      "Open pending Leave, device, security, or correction queues.",
      "Follow setup warnings before they affect employees.",
    ],
    "Every metric is read-only and links to the filtered workflow where action is taken.",
    "Business Admin, HR, managers, and employees see role-appropriate information",
  ),
];

export function portalHelpEntryForPath(pathname: string) {
  return (
    entries.find(({ match }) => match(pathname))?.entry ?? entries.at(-1)!.entry
  );
}

function route(
  key: string,
  matcher: string | RegExp,
  title: string,
  summary: string,
  useWhen: string,
  steps: string[],
  effect: string,
  access: string,
  dependencies?: string[],
) {
  return {
    match: (path: string) =>
      typeof matcher === "string"
        ? matcher === "/app"
          ? path === matcher
          : path.startsWith(matcher)
        : matcher.test(path),
    entry: {
      key,
      title,
      summary,
      useWhen,
      steps,
      effect,
      access,
      dependencies,
    },
  };
}
