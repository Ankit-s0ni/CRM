"use client";

import {
  BriefcaseBusiness,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  House,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "./page-primitives";

type ExceptionType = "ON_DUTY" | "WFH" | "OTHER";
type Employee = { id: string; employeeCode: string; fullName: string };
type AttendanceException = {
  id: string;
  employeeId: string;
  exceptionType: ExceptionType;
  startDate: string;
  endDate: string;
  reason: string;
  employee: Employee | null;
  createdAt: string;
  updatedAt: string;
};
type ExceptionResponse = {
  data: AttendanceException[];
  pagination: { page: number; limit: number; total: number; pages: number };
};
type FormState = {
  employeeId: string;
  exceptionType: ExceptionType;
  startDate: string;
  endDate: string;
  reason: string;
};
const emptyForm: FormState = {
  employeeId: "",
  exceptionType: "ON_DUTY",
  startDate: "",
  endDate: "",
  reason: "",
};

export function AttendanceExceptionsView() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canManage = permissions.includes("attendance.exceptions.manage");
  const [data, setData] = useState<ExceptionResponse | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<ExceptionType | "">("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AttendanceException | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (type) params.set("exceptionType", type);
      const requests: Promise<unknown>[] = [
        apiClient.get<ExceptionResponse>(`/attendance-exceptions?${params}`),
      ];
      if (canManage && !employees.length)
        requests.push(
          apiClient.get<{ data: Employee[] }>("/employees?limit=100"),
        );
      const [exceptions, employeeResult] = (await Promise.all(requests)) as [
        Awaited<ReturnType<typeof apiClient.get<ExceptionResponse>>>,
        Awaited<ReturnType<typeof apiClient.get<{ data: Employee[] }>>>?,
      ];
      setData(exceptions.data);
      if (employeeResult) setEmployees(employeeResult.data.data);
      setError("");
    } catch {
      setError("OD and WFH exceptions could not be loaded.");
    }
  }
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (type) params.set("exceptionType", type);
    Promise.all([
      apiClient.get<ExceptionResponse>(`/attendance-exceptions?${params}`),
      canManage
        ? apiClient.get<{ data: Employee[] }>("/employees?limit=100")
        : Promise.resolve(null),
    ])
      .then(([exceptions, employeeResult]) => {
        if (!active) return;
        setData(exceptions.data);
        if (employeeResult) setEmployees(employeeResult.data.data);
        setError("");
      })
      .catch(() => {
        if (active) setError("OD and WFH exceptions could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [page, type, canManage]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setEditorOpen(true);
  }
  function openEdit(item: AttendanceException) {
    setEditing(item);
    setForm({
      employeeId: item.employeeId,
      exceptionType: item.exceptionType,
      startDate: item.startDate,
      endDate: item.endDate,
      reason: item.reason,
    });
    setEditorOpen(true);
  }
  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
  }
  const overlap = data?.data.find(
    (item) =>
      item.id !== editing?.id &&
      item.employeeId === form.employeeId &&
      item.startDate <= form.endDate &&
      item.endDate >= form.startDate,
  );

  async function save() {
    setSaving(true);
    setError("");
    try {
      if (editing)
        await apiClient.patch(`/attendance-exceptions/${editing.id}`, form);
      else await apiClient.post("/attendance-exceptions", form);
      closeEditor();
      await load();
    } catch (requestError) {
      const apiError = requestError as AxiosError<{
        message?: string;
        code?: string;
      }>;
      setError(
        apiError.response?.data?.message ?? "The exception could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(item: AttendanceException) {
    if (
      !window.confirm(
        `Delete the ${label(item.exceptionType)} exception for ${item.employee?.fullName ?? "this employee"}?`,
      )
    )
      return;
    try {
      await apiClient.delete(`/attendance-exceptions/${item.id}`);
      await load();
    } catch {
      setError(
        "This exception cannot be deleted because its attendance period is locked.",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 lg:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#4f46e5]">
            Attendance operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            OD & WFH Exceptions
          </h1>
          <p className="mt-1 text-sm text-[#777587]">
            Record approved on-duty and work-from-home periods before attendance
            finalization.
          </p>
        </div>
        {canManage && (
          <PrimaryButton onClick={openCreate}>
            <Plus className="size-4" />
            Add exception
          </PrimaryButton>
        )}
      </header>
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="All exceptions"
          value={data?.pagination.total ?? 0}
          icon={CalendarRange}
        />
        <SummaryCard
          label="On duty"
          value={
            data?.data.filter((item) => item.exceptionType === "ON_DUTY")
              .length ?? 0
          }
          icon={BriefcaseBusiness}
          tone="bg-[#e3e0ff] text-[#3525cd]"
        />
        <SummaryCard
          label="Work from home"
          value={
            data?.data.filter((item) => item.exceptionType === "WFH").length ??
            0
          }
          icon={House}
          tone="bg-[#d9f1ff] text-[#005f79]"
        />
      </section>
      <Panel className="mb-4 flex flex-wrap items-center gap-2 p-3">
        <span className="mr-2 text-xs font-semibold text-[#777587]">Show</span>
        {[
          { value: "", label: "All" },
          { value: "ON_DUTY", label: "On duty" },
          { value: "WFH", label: "Work from home" },
          { value: "OTHER", label: "Other" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setPage(1);
              setType(option.value as ExceptionType | "");
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              type === option.value
                ? "border-[#3525cd] bg-[#3525cd] text-white"
                : "border-[#ddd8e7] bg-white text-[#646273]",
            )}
          >
            {option.label}
          </button>
        ))}
      </Panel>
      {error && (
        <div className="mb-4">
          <ErrorState message={error} />
        </div>
      )}
      {!data ? (
        <LoadingState />
      ) : data.data.length ? (
        <ExceptionTable
          data={data.data}
          canManage={canManage}
          onEdit={openEdit}
          onDelete={remove}
        />
      ) : (
        <Panel>
          <EmptyState
            title="No exceptions recorded"
            body="Approved on-duty and work-from-home periods will appear here."
          />
        </Panel>
      )}
      {data && data.pagination.pages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="grid size-9 place-items-center rounded-lg border bg-white disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            disabled={page >= data.pagination.pages}
            onClick={() => setPage((value) => value + 1)}
            className="grid size-9 place-items-center rounded-lg border bg-white disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
      {canManage && editorOpen && (
        <ExceptionEditor
          form={form}
          editing={editing}
          employees={employees}
          overlap={overlap}
          saving={saving}
          onChange={setForm}
          onClose={closeEditor}
          onSave={save}
        />
      )}
    </div>
  );
}

function ExceptionTable({
  data,
  canManage,
  onEdit,
  onDelete,
}: {
  data: AttendanceException[];
  canManage: boolean;
  onEdit: (item: AttendanceException) => void;
  onDelete: (item: AttendanceException) => void;
}) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left">
        <thead>
          <tr className="border-b border-[#e4e1ee] bg-[#f5f2ff] text-[10px] font-bold uppercase tracking-wider text-[#777587]">
            <Th>Employee</Th>
            <Th>Type</Th>
            <Th>Date range</Th>
            <Th>Reason</Th>
            <Th>Updated</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className="border-b border-[#eeeaf3] last:border-0"
            >
              <Td>
                <strong className="block text-sm">
                  {item.employee?.fullName ?? "Unknown employee"}
                </strong>
                <span className="text-xs text-[#777587]">
                  {item.employee?.employeeCode}
                </span>
              </Td>
              <Td>
                <TypeBadge type={item.exceptionType} />
              </Td>
              <Td>
                <span className="text-sm font-medium">
                  {shortDate(item.startDate)}
                </span>
                {item.endDate !== item.startDate && (
                  <span className="text-sm"> – {shortDate(item.endDate)}</span>
                )}
              </Td>
              <Td>
                <p className="max-w-sm truncate text-sm text-[#464555]">
                  {item.reason}
                </p>
              </Td>
              <Td>
                <span className="text-xs text-[#777587]">
                  {shortDate(item.updatedAt.slice(0, 10))}
                </span>
              </Td>
              <Td>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      aria-label="Edit exception"
                      onClick={() => onEdit(item)}
                      className="grid size-8 place-items-center rounded-lg bg-[#ece9ff] text-[#3525cd]"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      aria-label="Delete exception"
                      onClick={() => onDelete(item)}
                      className="grid size-8 place-items-center rounded-lg bg-[#ffdad6] text-[#ba1a1a]"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ExceptionEditor({
  form,
  editing,
  employees,
  overlap,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  form: FormState;
  editing: AttendanceException | null;
  employees: Employee[];
  overlap?: AttendanceException;
  saving: boolean;
  onChange: (form: FormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const ready =
    form.employeeId &&
    form.startDate &&
    form.endDate &&
    form.reason.trim() &&
    !overlap;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#1b1b24]/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exception-title"
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#4f46e5]">
              Attendance exception
            </p>
            <h2 id="exception-title" className="mt-1 text-xl font-bold">
              {editing ? "Edit approved period" : "Add approved period"}
            </h2>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-lg bg-[#f0ecf9]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="grid gap-4">
          <Field label="Employee">
            <select
              autoFocus
              className={inputClass}
              value={form.employeeId}
              onChange={(event) =>
                onChange({ ...form, employeeId: event.target.value })
              }
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} · {employee.employeeCode}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exception type">
            <div className="grid grid-cols-3 gap-2">
              {(["ON_DUTY", "WFH", "OTHER"] as ExceptionType[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...form, exceptionType: value })}
                  className={cn(
                    "rounded-xl border p-3 text-xs font-semibold",
                    form.exceptionType === value
                      ? "border-[#3525cd] bg-[#ece9ff] text-[#3525cd]"
                      : "border-[#ddd8e7]",
                  )}
                >
                  {label(value)}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(event) =>
                  onChange({ ...form, startDate: event.target.value })
                }
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                min={form.startDate}
                className={inputClass}
                value={form.endDate}
                onChange={(event) =>
                  onChange({ ...form, endDate: event.target.value })
                }
              />
            </Field>
          </div>
          {overlap && (
            <div className="rounded-xl border border-[#ffb4ab] bg-[#ffdad6] p-3 text-xs text-[#93000a]">
              This overlaps an existing{" "}
              {label(overlap.exceptionType).toLowerCase()} exception from{" "}
              {overlap.startDate} to {overlap.endDate}.
            </div>
          )}
          <Field label="Approval reason">
            <textarea
              className="min-h-24 w-full rounded-lg border border-[#c7c4d8] p-3 text-sm outline-none focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/15"
              maxLength={500}
              value={form.reason}
              onChange={(event) =>
                onChange({ ...form, reason: event.target.value })
              }
              placeholder="Add the approved business reason"
            />
          </Field>
          <div className="rounded-xl bg-[#f5f2ff] p-3 text-xs text-[#646273]">
            <ShieldCheck className="mr-2 inline size-4 text-[#3525cd]" />
            Changes are audited and cannot alter payroll-locked attendance
            periods.
          </div>
          <PrimaryButton disabled={!ready || saving} onClick={onSave}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create exception"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label: title,
  value,
  icon: Icon,
  tone = "bg-[#ece9ff] text-[#3525cd]",
}: {
  label: string;
  value: number;
  icon: typeof CalendarRange;
  tone?: string;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-[#e4e1ee] bg-white p-4 shadow-sm">
      <span className={cn("grid size-10 place-items-center rounded-lg", tone)}>
        <Icon className="size-5" />
      </span>
      <div>
        <strong className="block text-xl">{value}</strong>
        <span className="text-xs text-[#777587]">{title}</span>
      </div>
    </article>
  );
}
function TypeBadge({ type }: { type: ExceptionType }) {
  const value =
    type === "WFH"
      ? "bg-[#d9f1ff] text-[#005f79]"
      : type === "ON_DUTY"
        ? "bg-[#e3e0ff] text-[#3525cd]"
        : "bg-[#ece9f2] text-[#646273]";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase",
        value,
      )}
    >
      {label(type)}
    </span>
  );
}
function label(type: ExceptionType) {
  return type === "WFH"
    ? "Work from home"
    : type === "ON_DUTY"
      ? "On duty"
      : "Other";
}
function shortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-5 py-3">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
