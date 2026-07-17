"use client";

import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Fingerprint,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { EmployeeDevicePanel } from "./device-management-view";
import {
  AdminPage,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "./page-primitives";

type EmployeeDetail = {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string | null;
  workType: string;
  status: string;
  dateOfJoining: string;
  dateOfExit: string | null;
  department: { id: string; name: string };
  designation: { id: string; name: string } | null;
  manager: { id: string; employeeCode: string; fullName: string } | null;
  _count?: { reports: number };
};

type BiometricStatus = {
  consentActive: boolean;
  consentPolicyVersion: string | null;
  enrolled: boolean;
  version: number | null;
  enrolledAt: string | null;
  eligibleForFaceVerification: boolean;
};

export function EmployeeDetailView({ employeeId }: { employeeId: string }) {
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const canReadBiometrics = permissions.includes("attendance.biometrics.read");
  const canManageBiometrics = permissions.includes("attendance.biometrics.manage");
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [biometrics, setBiometrics] = useState<BiometricStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const employeeResponse = await apiClient.get(`/employees/${employeeId}`);
      setEmployee(employeeResponse.data.data);
      if (canReadBiometrics) {
        const biometricResponse = await apiClient.get(
          `/face-enrollments/${employeeId}/status`,
        );
        setBiometrics(biometricResponse.data.data);
      }
    } catch {
      setError("Employee details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const requests = [apiClient.get(`/employees/${employeeId}`)];
    if (canReadBiometrics) {
      requests.push(apiClient.get(`/face-enrollments/${employeeId}/status`));
    }
    Promise.all(requests)
      .then(([employeeResponse, biometricResponse]) => {
        if (!active) return;
        setEmployee(employeeResponse.data.data);
        if (biometricResponse) setBiometrics(biometricResponse.data.data);
      })
      .catch(() => {
        if (active) setError("Employee details could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [employeeId, canReadBiometrics]);

  if (loading) {
    return (
      <AdminPage title="Employee profile" description="Loading employee identity and attendance access.">
        <LoadingState />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title={employee?.fullName || "Employee profile"}
      description={employee ? `${employee.employeeCode} · ${employee.workType}` : "Employee identity and attendance access."}
      action={
        <Link
          href="/app/employees"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d8d4e4] bg-white px-4 text-sm font-semibold text-[#464555]"
        >
          <ArrowLeft className="size-4" /> Employees
        </Link>
      }
    >
      {error && <ErrorState message={error} />}
      {employee && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.7fr)]">
          <div className="grid gap-6">
            <Panel className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl bg-[#e3e0ff] text-[#3525cd]">
                    <UserRound className="size-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Employment profile</h2>
                    <p className="mt-1 text-sm text-[#777587]">
                      {employee.phone || "No phone number recorded"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#d8f8df] px-3 py-1 text-xs font-bold text-[#005320]">
                  {employee.status}
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Department" value={employee.department.name} icon={Building2} />
                <Detail
                  label="Designation"
                  value={employee.designation?.name || "Not assigned"}
                  icon={BriefcaseBusiness}
                />
                <Detail
                  label="Manager"
                  value={employee.manager?.fullName || "No manager"}
                  icon={UserRound}
                />
                <Detail
                  label="Joined"
                  value={formatDate(employee.dateOfJoining)}
                  icon={CalendarDays}
                />
              </div>
            </Panel>

            <div>
              <div className="mb-3">
                <h2 className="text-xl font-bold">Registered devices</h2>
                <p className="mt-1 text-sm text-[#777587]">
                  Approve, block, or replace devices with an auditable reason.
                </p>
              </div>
              <EmployeeDevicePanel employeeId={employeeId} />
            </div>
          </div>

          <Panel className="h-fit p-6">
            <div className="grid size-12 place-items-center rounded-xl bg-[#eeebff] text-[#3525cd]">
              <Fingerprint className="size-6" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Biometric identity</h2>
            {!canReadBiometrics ? (
              <p className="mt-3 text-sm text-[#777587]">
                You do not have permission to view biometric enrollment status.
              </p>
            ) : biometrics ? (
              <>
                <div className="mt-5 grid gap-3">
                  <IdentityRow
                    label="Consent"
                    value={biometrics.consentActive ? "Active" : "Not active"}
                    positive={biometrics.consentActive}
                  />
                  <IdentityRow
                    label="Face profile"
                    value={biometrics.enrolled ? `Enrolled · v${biometrics.version}` : "Not enrolled"}
                    positive={biometrics.enrolled}
                  />
                  <IdentityRow
                    label="Attendance eligible"
                    value={biometrics.eligibleForFaceVerification ? "Yes" : "No"}
                    positive={biometrics.eligibleForFaceVerification}
                  />
                </div>
                {biometrics.enrolledAt && (
                  <p className="mt-4 text-xs text-[#777587]">
                    Enrolled {formatDate(biometrics.enrolledAt)}
                  </p>
                )}
                {canManageBiometrics && biometrics.enrolled && (
                  <button
                    type="button"
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#ba1a1a] px-4 text-sm font-semibold text-[#ba1a1a]"
                    onClick={() => setResetOpen(true)}
                  >
                    Reset face profile
                  </button>
                )}
              </>
            ) : (
              <LoadingState />
            )}
          </Panel>
        </div>
      )}
      {resetOpen && (
        <FaceResetDialog
          employeeId={employeeId}
          employeeName={employee?.fullName || "employee"}
          onClose={() => setResetOpen(false)}
          onComplete={async () => {
            setResetOpen(false);
            await load();
          }}
        />
      )}
    </AdminPage>
  );
}

function FaceResetDialog({
  employeeId,
  employeeName,
  onClose,
  onComplete,
}: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function reset() {
    if (reason.trim().length < 5) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/face-enrollments/${employeeId}/reset`, {
        reason: reason.trim(),
      });
      await onComplete();
    } catch {
      setError("The face profile could not be reset. Refresh and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#17151f]/55 p-4" role="dialog" aria-modal="true">
      <Panel className="w-full max-w-lg p-6 shadow-2xl">
        <div className="grid size-12 place-items-center rounded-xl bg-[#ffdad6] text-[#93000a]">
          <Fingerprint className="size-6" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Reset {employeeName}’s face profile?</h2>
        <p className="mt-2 text-sm text-[#777587]">
          Existing biometric evidence will be revoked and deleted. The employee must complete enrollment again.
        </p>
        <div className="mt-5 grid gap-4">
          <Field label="Reset reason">
            <textarea
              className={`${inputClass} min-h-28 py-3`}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {error && <ErrorState message={error} />}
          <div className="flex gap-3">
            <button type="button" className="min-h-11 flex-1 rounded-xl border border-[#d8d4e4] px-4 text-sm font-semibold" onClick={onClose}>
              Cancel
            </button>
            <PrimaryButton className="flex-1" disabled={saving || reason.trim().length < 5} onClick={() => void reset()}>
              {saving ? "Resetting…" : "Reset profile"}
            </PrimaryButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}) {
  return (
    <div className="rounded-xl bg-[#f6f3fb] p-4">
      <Icon className="size-5 text-[#3525cd]" />
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[#777587]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function IdentityRow({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-[#f6f3fb] p-3">
      <span className="text-sm text-[#646171]">{label}</span>
      <span className={`inline-flex items-center gap-1 text-sm font-bold ${positive ? "text-[#005320]" : "text-[#7a4d00]"}`}>
        {positive && <ShieldCheck className="size-4" />} {value}
      </span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
