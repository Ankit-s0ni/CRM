"use client";

import { ArrowRight, Search, Settings2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useDeferredValue, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

type EmployeeResult = {
  id: string;
  employeeCode: string;
  fullName: string;
  department: { name: string };
};

const destinations = [
  { label: "Employee directory", href: "/app/employees", permissions: ["organization.employees.read", "organization.employees.reports.read"] },
  { label: "Organization structure", href: "/app/employees/organization", permissions: ["organization.departments.read"] },
  { label: "Employee import", href: "/app/employees/import", permissions: ["organization.imports.read"] },
  { label: "Modules", href: "/app/modules", permissions: ["workspace.modules.read"] },
  { label: "Attendance", href: "/app/modules/attendance", permissions: ["attendance.records.read", "attendance.config.read"] },
  { label: "Attendance leave", href: "/app/attendance/leave", permissions: ["leave.self", "leave.approve", "leave.manage"] },
  { label: "Reports", href: "/app/reports", permissions: ["attendance.reports.read", "attendance.reports.generate"] },
  { label: "Company settings", href: "/app/settings/company", permissions: ["workspace.settings.read"] },
  { label: "Admin access", href: "/app/settings/access", permissions: ["identity.roles.read"] },
  { label: "Attendance policies", href: "/app/attendance/policies", permissions: ["attendance.policies.read", "attendance.policies.manage"] },
  { label: "Billing", href: "/app/settings/billing", permissions: ["billing.subscription.read"] },
] as const;

export function PortalSearch() {
  const router = useRouter();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
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

  const matchedDestinations = query.trim()
    ? destinations.filter(
        ({ label, permissions: required }) =>
          label.toLowerCase().includes(query.trim().toLowerCase()) &&
          required.some((permission) => permissions.includes(permission)),
      )
    : [];
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
    <form className="relative w-full max-w-md" onSubmit={submit} role="search">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" />
      <input
        aria-label="Search employees or settings"
        autoComplete="off"
        className="h-10 w-full rounded-full border-0 bg-zinc-50 pl-11 pr-4 text-sm outline-none ring-primary focus:ring-2"
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(Boolean(event.target.value.trim()));
        }}
        onFocus={() => setOpen(Boolean(query.trim()))}
        placeholder="Search employees or settings..."
        value={query}
      />
      {open &&
        (visibleEmployees.length > 0 || matchedDestinations.length > 0) && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-xl">
          {visibleEmployees.map((employee) => (
            <button
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-zinc-50"
              key={employee.id}
              onMouseDown={() => navigate(`/app/employees/${employee.id}`)}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-zinc-100 text-primary">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">
                  {employee.fullName}
                </strong>
                <span className="block truncate text-xs text-outline">
                  {employee.employeeCode} · {employee.department.name}
                </span>
              </span>
              <ArrowRight className="size-4 text-zinc-400" />
            </button>
          ))}
          {matchedDestinations.map(({ label, href }) => (
            <button
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-zinc-50"
              key={href}
              onMouseDown={() => navigate(href)}
              type="button"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-zinc-50 text-primary">
                <Settings2 className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">{label}</span>
              <ArrowRight className="size-4 text-zinc-400" />
            </button>
          ))}
        </div>
        )}
    </form>
  );
}
