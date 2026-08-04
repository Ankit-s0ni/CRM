"use client";

import {
  ArrowRight,
  Clock3,
  FileBarChart,
  Search,
  Settings2,
  UserRound,
} from "lucide-react";
import { FormEvent, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { tenantMessage } from "@/i18n/tenant-message";
import { apiClient } from "@/lib/api-client";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization as useLocalization } from "@/lib/tenant-localization";

type EmployeeResult = {
  id: string;
  employeeCode: string;
  fullName: string;
  department: { name: string };
};

const destinations = [
  {
    label: tenantMessage("Employee directory"),
    localizationKey: "tenant.search.employeeDirectory",
    href: "/app/employees",
    category: "People",
    permissions: [
      "organization.employees.read",
      "organization.employees.reports.read",
    ],
  },
  {
    label: tenantMessage("Organization structure"),
    localizationKey: "tenant.search.organizationStructure",
    href: "/app/employees/organization",
    category: "People",
    permissions: ["organization.departments.read"],
  },
  {
    label: tenantMessage("Employee import"),
    localizationKey: "tenant.search.employeeImport",
    href: "/app/employees/import",
    category: "People",
    permissions: ["organization.imports.read"],
  },
  {
    label: tenantMessage("Modules"),
    localizationKey: "tenant.navigation.modules",
    href: "/app/modules",
    category: "Workspace",
    permissions: ["workspace.modules.read"],
  },
  {
    label: tenantMessage("Attendance"),
    localizationKey: "tenant.navigation.attendance",
    href: "/app/modules/attendance",
    category: "Operations",
    permissions: ["attendance.records.read", "attendance.config.read"],
  },
  {
    label: tenantMessage("Attendance register"),
    localizationKey: "tenant.search.attendanceRegister",
    href: "/app/attendance/register",
    category: "Operations",
    permissions: ["attendance.records.read"],
  },
  {
    label: tenantMessage("Attendance leave"),
    localizationKey: "tenant.search.attendanceLeave",
    href: "/app/attendance/leave",
    category: "Operations",
    permissions: ["leave.self", "leave.approve", "leave.manage"],
  },
  {
    label: tenantMessage("Reports"),
    localizationKey: "tenant.navigation.reports",
    href: "/app/reports",
    category: "Insights",
    permissions: ["attendance.reports.read", "attendance.reports.generate"],
  },
  {
    label: tenantMessage("Company settings"),
    localizationKey: "tenant.search.companySettings",
    href: "/app/settings/company",
    category: "Settings",
    permissions: ["workspace.settings.read"],
  },
  {
    label: tenantMessage("Admin access"),
    localizationKey: "tenant.navigation.adminAccess",
    href: "/app/settings/access",
    category: "Settings",
    permissions: ["identity.roles.read"],
  },
  {
    label: tenantMessage("Attendance policies"),
    localizationKey: "tenant.search.attendancePolicies",
    href: "/app/attendance/policies",
    category: "Settings",
    permissions: ["attendance.policies.read", "attendance.policies.manage"],
  },
  {
    label: tenantMessage("Billing"),
    localizationKey: "tenant.navigation.billing",
    href: "/app/settings/billing",
    category: "Settings",
    permissions: ["billing.subscription.read"],
  },
] as const;

export function PortalSearch() {
  const router = useRouter();
  const { t } = useLocalization();
  const permissions = useAuthStore(
    (state) => state.user?.permissions ?? EMPTY_PERMISSIONS,
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [employees, setEmployees] = useState<EmployeeResult[]>([]);
  const [open, setOpen] = useState(false);
  const canSearchEmployees = [
    "organization.employees.read",
    "organization.employees.reports.read",
  ].some((permission) => permissions.includes(permission));

  useEffect(() => {
    if (!canSearchEmployees || deferredQuery.length < 2) {
      return;
    }
    let active = true;
    const params = new URLSearchParams({
      search: deferredQuery,
      page: "1",
      limit: "6",
    });
    apiClient
      .get<{ data: EmployeeResult[] }>(`/employees?${params}`)
      .then(({ data }) => {
        if (active) setEmployees(data.data);
      })
      .catch(() => {
        if (active) setEmployees([]);
      });
    return () => {
      active = false;
    };
  }, [canSearchEmployees, deferredQuery]);

  const visibleDestinations = destinations.filter(({ permissions: required }) =>
    required.some((permission) => permissions.includes(permission)),
  );
  const matchedDestinations = query.trim()
    ? visibleDestinations.filter(({ label }) =>
        label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];
  const quickDestinations = visibleDestinations.slice(0, 5);
  const visibleEmployees =
    canSearchEmployees && deferredQuery.length >= 2 ? employees : [];

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate(`/app/employees?search=${encodeURIComponent(value)}`);
  }

  return (
    <form className="relative w-full max-w-xl" onSubmit={submit} role="search">
      <Search className="absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        aria-label={t(
          "tenant.search.label",
          "Search employees or settings",
        )}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-border bg-muted/70 ps-11 pe-24 text-sm outline-none transition placeholder:text-muted-foreground hover:bg-white focus:border-ring focus:bg-white focus:ring-2 focus:ring-ring/20"
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t(
          "tenant.search.placeholder",
          "Search people, pages, settings...",
        )}
        value={query}
      />
      <span className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground lg:inline-flex">
        /
      </span>
      {open && (
        <div className="absolute inset-x-0 top-12 z-50 max-h-96 overflow-y-auto rounded-lg border border-border bg-white p-2 shadow-xl">
          {!query.trim() && (
            <>
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("tenant.search.quickOpen", "Quick open")}
              </div>
              {quickDestinations.map(
                ({ label, href, category, localizationKey }) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-start transition hover:bg-muted"
                    key={href}
                    onMouseDown={() => navigate(href)}
                    type="button"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground">
                      {category === "Insights" ? (
                        <FileBarChart className="size-4" />
                      ) : (
                        <Clock3 className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">
                        {t(localizationKey, label)}
                      </strong>
                      <span className="block truncate text-xs text-muted-foreground">
                        {category}
                      </span>
                    </span>
                    <ArrowRight className="directional-icon size-4 text-muted-foreground" />
                  </button>
                ),
              )}
            </>
          )}
          {visibleEmployees.map((employee) => (
            <button
              className="flex w-full items-center gap-3 rounded-lg p-3 text-start transition hover:bg-muted"
              key={employee.id}
              onMouseDown={() => navigate(`/app/employees/${employee.id}`)}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-zinc-100 text-foreground">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {employee.fullName}
                </strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {employee.employeeCode} - {employee.department.name}
                </span>
              </span>
              <ArrowRight className="directional-icon size-4 text-muted-foreground" />
            </button>
          ))}
          {matchedDestinations.map(({ label, href, category }) => (
            <button
              className="flex w-full items-center gap-3 rounded-lg p-3 text-start transition hover:bg-muted"
              key={href}
              onMouseDown={() => navigate(href)}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-zinc-50 text-foreground">
                <Settings2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {t(
                    destinations.find((destination) => destination.href === href)
                      ?.localizationKey ?? "",
                    label,
                  )}
                </strong>
                <span className="block truncate text-xs text-muted-foreground">
                  {category}
                </span>
              </span>
              <ArrowRight className="directional-icon size-4 text-muted-foreground" />
            </button>
          ))}
          {query.trim() &&
            visibleEmployees.length === 0 &&
            matchedDestinations.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t("tenant.search.noResults", "No matching people or pages")}
              </div>
            )}
        </div>
      )}
    </form>
  );
}
