"use client";
/* eslint-disable @next/next/no-img-element -- Blob previews cannot use the image optimizer. */

import { BellRing, Building2, Check, ChevronRight, ShieldCheck, UploadCloud } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/lib/auth-store";
import {
  AdminPage,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";
import { WeeklyOffEditor, type WeeklyOffValue } from "@/features/products/attendance/configuration/weekly-off-editor";
import { TimezoneSelect } from "@/shared/components/timezone-select";
import { FeatureInfo } from "@/features/platform/help/feature-info";
import type { AttendanceHelpKey } from "@/content/attendance-help";
import { useTenantLocalization } from "@/lib/tenant-localization";
import { OrganizationView } from "@/features/platform/organization/organization-access-views";
import { OfficesView } from "@/features/products/attendance/configuration/attendance-config-views";

type Settings = {
  timezone: string;
  locale: string;
  weeklyOffs: WeeklyOffValue;
  workingDayStart: string;
  workingDayEnd: string;
  requireFacialRecognition: boolean;
  faceMatchThreshold: number;
  fieldTrackingIntervalMin: number;
  fieldTrackingEnabled: boolean;
  checkinReminderEnabled: boolean;
  checkoutReminderMinutes: number;
  absenteeAlertTime: string;
  onboardingStep: number;
  onboardingVersion: number;
  companyLogoKey?: string;
  logoUrl?: string | null;
};

type NotificationPreference = {
  eventKey: string;
  channel: "IN_APP" | "EMAIL" | "PUSH";
  label: string;
  enabled: boolean;
  mandatory: boolean;
};

const defaultSettings: Settings = {
  timezone: "Asia/Kolkata",
  locale: "en",
  weeklyOffs: [{ weekday: "SAT", occurrences: [2, 4] }, "SUN"],
  workingDayStart: "09:00",
  workingDayEnd: "18:00",
  requireFacialRecognition: false,
  faceMatchThreshold: 85,
  fieldTrackingIntervalMin: 15,
  fieldTrackingEnabled: false,
  checkinReminderEnabled: true,
  checkoutReminderMinutes: 15,
  absenteeAlertTime: "10:00",
  onboardingStep: 1,
  onboardingVersion: 2,
};

type OnboardingStepKey = "company" | "organization" | "office" | "workingDays" | "attendancePolicy" | "hrInvite";

type OnboardingStatus = {
  completed: boolean;
  currentStep: number;
  onboardingVersion: number;
  steps: Record<OnboardingStepKey, boolean>;
  missingSteps: OnboardingStepKey[];
};

export function NotificationPreferencesView() {
  const { tText } = useTenantLocalization();
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    apiClient
      .get<{ data: NotificationPreference[] }>("/notification-preferences")
      .then(({ data }) => setPreferences(data.data))
      .catch(() => setError(tText("Notification preferences could not be loaded.")));

  useEffect(() => {
    void load();
  }, []);

  async function toggle(preference: NotificationPreference) {
    if (preference.mandatory) return;
    const key = `${preference.eventKey}:${preference.channel}`;
    setSaving(key);
    setError("");
    try {
      const response = await apiClient.put<{
        data: NotificationPreference[];
      }>("/notification-preferences", {
        preferences: [
          {
            eventKey: preference.eventKey,
            channel: preference.channel,
            enabled: !preference.enabled,
          },
        ],
      });
      setPreferences(response.data.data);
    } catch {
      setError(tText("Your notification preference could not be saved."));
    } finally {
      setSaving(null);
    }
  }

  const events = preferences ? Array.from(new Set(preferences.map(({ eventKey }) => eventKey))) : [];

  return (
    <AdminPage
      title={tText("My notification preferences")}
      description={tText(
        "Choose how DeltCRM sends optional notices to your account. Mandatory security and decision notices stay enabled.",
      )}
      action={
        <Link
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-[#151515]"
          href="/app/notifications"
        >
          <BellRing className="size-4" /> {tText("Open inbox")}
        </Link>
      }
    >
      {error && <ErrorState message={error} />}
      {!preferences ? (
        <LoadingState />
      ) : (
        <Panel className="overflow-hidden">
          <div className="grid grid-cols-[1fr_repeat(3,92px)] border-b border-surface-variant bg-zinc-50 px-5 py-3 text-xs font-bold uppercase text-outline">
            <span>{tText("Notice")}</span>
            <span className="text-center">{tText("In app")}</span>
            <span className="text-center">{tText("Email")}</span>
            <span className="text-center">{tText("Push")}</span>
          </div>
          {events.map((eventKey) => {
            const rows = preferences.filter((preference) => preference.eventKey === eventKey);
            return (
              <div
                className="grid grid-cols-[1fr_repeat(3,92px)] items-center border-b border-surface-variant px-5 py-4 last:border-0"
                key={eventKey}
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold">{rows[0]?.label}</div>
                  <div className="text-xs text-outline">
                    {eventKey}
                    {rows.some(({ mandatory }) => mandatory) ? tText("· Required") : ""}
                  </div>
                </div>
                {(["IN_APP", "EMAIL", "PUSH"] as const).map((channel) => {
                  const preference = rows.find((row) => row.channel === channel);
                  const key = `${eventKey}:${channel}`;
                  return (
                    <div className="grid place-items-center" key={channel}>
                      {preference ? (
                        <button
                          aria-checked={preference.enabled}
                          aria-label={`${preference.label} via ${channel}`}
                          className={`relative h-6 w-11 rounded-full transition ${preference.enabled ? "bg-[#151515]" : "bg-zinc-300"} disabled:cursor-not-allowed disabled:opacity-60`}
                          disabled={preference.mandatory || saving === key}
                          onClick={() => void toggle(preference)}
                          role="switch"
                          type="button"
                        >
                          <span
                            className={`absolute top-1 size-4 rounded-full bg-white transition ${preference.enabled ? "left-6" : "left-1"}`}
                          />
                        </button>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Panel>
      )}
      <p className="mt-4 text-sm text-zinc-500">
        {tText("These preferences apply only to your signed-in account, not to every employee in the company.")}
      </p>
    </AdminPage>
  );
}

function writableSettings(settings: Settings) {
  const {
    timezone,
    locale,
    weeklyOffs,
    workingDayStart,
    workingDayEnd,
    requireFacialRecognition,
    faceMatchThreshold,
    fieldTrackingIntervalMin,
    fieldTrackingEnabled,
    checkinReminderEnabled,
    checkoutReminderMinutes,
    absenteeAlertTime,
    onboardingStep,
    onboardingVersion,
  } = settings;

  return {
    timezone,
    locale,
    weeklyOffs,
    workingDayStart,
    workingDayEnd,
    requireFacialRecognition,
    faceMatchThreshold,
    fieldTrackingIntervalMin,
    fieldTrackingEnabled,
    checkinReminderEnabled,
    checkoutReminderMinutes,
    absenteeAlertTime,
    onboardingStep,
    onboardingVersion,
  };
}

function onboardingStepSettings(settings: Settings, nextStep: number) {
  const progress = {
    onboardingStep: nextStep,
    onboardingVersion: 2,
  };
  if (nextStep === 2) {
    return {
      timezone: settings.timezone,
      locale: settings.locale,
      ...progress,
    };
  }
  if (nextStep === 5) {
    return {
      weeklyOffs: settings.weeklyOffs,
      workingDayStart: settings.workingDayStart,
      workingDayEnd: settings.workingDayEnd,
      ...progress,
    };
  }
  if (nextStep === 6) {
    return {
      requireFacialRecognition: settings.requireFacialRecognition,
      faceMatchThreshold: settings.faceMatchThreshold,
      fieldTrackingIntervalMin: settings.fieldTrackingIntervalMin,
      fieldTrackingEnabled: settings.fieldTrackingEnabled,
      checkinReminderEnabled: settings.checkinReminderEnabled,
      checkoutReminderMinutes: settings.checkoutReminderMinutes,
      absenteeAlertTime: settings.absenteeAlertTime,
      ...progress,
    };
  }
  return progress;
}

export function OnboardingWizard() {
  const { tText } = useTenantLocalization();
  const router = useRouter();
  const { accessToken, hasHydrated, user, setUser } = useAuthStore();
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [readiness, setReadiness] = useState<Record<OnboardingStepKey, boolean>>({
    company: true,
    organization: false,
    office: false,
    workingDays: true,
    attendancePolicy: true,
    hrInvite: true,
  });

  useEffect(() => {
    if (hasHydrated && !accessToken) router.replace("/login");
    if (!accessToken) return;
    Promise.all([apiClient.get("/onboarding/status"), apiClient.get("/tenant-settings"), apiClient.get("/roles")])
      .then(([status, current, roleResult]) => {
        const onboardingStatus = status.data.data as OnboardingStatus;
        if (onboardingStatus.completed) router.replace("/app");
        setStep(onboardingStatus.currentStep || 1);
        setReadiness(onboardingStatus.steps);
        if (current.data.data) {
          setSettings({ ...defaultSettings, ...current.data.data });
          setLogoPreview(current.data.data.logoUrl ?? "");
        }
        setRoles(roleResult.data.data);
      })
      .catch(() => setError(tText("We couldn't load your setup progress.")))
      .finally(() => setLoading(false));
  }, [accessToken, hasHydrated, router]);

  async function continueSetup() {
    setSaving(true);
    setError("");
    try {
      if (step === 6) {
        if (inviteEmail) {
          const hrRole = roles.find(({ name }) => name === "HR_ADMIN");
          if (!hrRole) throw new Error("HR role unavailable");
          await apiClient.post("/users/invitations", {
            email: inviteEmail,
            roleIds: [hrRole.id],
          });
        }
        await apiClient.post("/onboarding/complete", {
          progress: { completedSteps: 6, onboardingVersion: 2 },
        });
        router.replace("/app/settings");
        return;
      }
      const next = step + 1;
      await apiClient.patch("/tenant-settings", onboardingStepSettings(settings, next));
      setSettings((current) => ({
        ...current,
        onboardingStep: next,
        onboardingVersion: 2,
      }));
      setStep(next);
    } catch (cause) {
      setError(
        getApiErrorMessage(
          cause,
          tText("Your progress could not be saved. Please try again."),
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    setError("");
    try {
      const result = await uploadCompanyLogo(file);
      setSettings((current) => ({
        ...current,
        companyLogoKey: result.objectKey,
      }));
      setLogoPreview(URL.createObjectURL(file));
      if (user && result.logoUrl) setUser({ ...user, logoUrl: result.logoUrl });
    } catch {
      setError(tText("Logo upload failed. Use PNG, JPEG or WebP up to 2 MB."));
    }
  }

  if (!hasHydrated || loading)
    return (
      <div className="min-h-screen bg-surface p-12">
        <LoadingState />
      </div>
    );
  const stepDefinitions: Array<{ key: OnboardingStepKey; label: string }> = [
    { key: "company", label: tText("Company profile") },
    { key: "organization", label: tText("Organization") },
    { key: "office", label: tText("Office") },
    { key: "workingDays", label: tText("Working days") },
    { key: "attendancePolicy", label: tText("Attendance policy") },
    { key: "hrInvite", label: tText("Invite HR") },
  ];
  const currentStepKey = stepDefinitions[step - 1]?.key ?? "company";
  const currentStepReady = readiness[currentStepKey];
  const embeddedSetupStep = step === 2 || step === 3;

  return (
    <div className="min-h-screen bg-surface text-zinc-900">
      <header className="flex h-20 items-center justify-between border-b border-surface-variant bg-white px-8">
        <div className="flex items-center gap-4">
          <strong className="text-xl text-[#151515]">{tText("DeltCRM")}</strong>
          <span className="h-6 w-px bg-zinc-300" />
          <span className="text-sm text-on-surface-variant">{tText("Setup Wizard")}</span>
        </div>
        <span className="text-sm text-outline">{tText("Support")}</span>
      </header>
      <main className="mx-auto max-w-[1440px] px-6 py-12">
        <div className="mx-auto mb-12 flex max-w-[1080px] items-start overflow-x-auto pb-2">
          {stepDefinitions.map(({ label }, index) => (
            <div key={label} className="flex flex-1 items-start last:flex-none">
              <div className="grid justify-items-center gap-2">
                <div
                  className={`grid size-10 place-items-center rounded-full font-bold ${index + 1 <= step ? "bg-[#151515] text-white" : "bg-surface-variant text-on-surface-variant"}`}
                >
                  {index + 1 < step ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={`whitespace-nowrap text-xs font-semibold ${index + 1 === step ? "text-[#151515]" : "text-outline"}`}
                >
                  {label}
                </span>
              </div>
              {index < stepDefinitions.length - 1 && (
                <div className={`mt-5 h-0.5 flex-1 ${index + 1 < step ? "bg-[#151515]" : "bg-surface-variant"}`} />
              )}
            </div>
          ))}
        </div>
        {error && (
          <div className="mx-auto mb-4 max-w-[1200px]">
            <ErrorState message={error} />
          </div>
        )}
        <div
          className={`mx-auto grid min-h-[600px] max-w-[1320px] overflow-hidden rounded-xl border border-surface-variant bg-white shadow-xl ${embeddedSetupStep ? "" : "lg:grid-cols-[1.1fr_.9fr]"}`}
        >
          <section className={embeddedSetupStep ? "p-6 lg:p-10" : "p-8 lg:p-16"}>
            <div className={embeddedSetupStep ? "mx-auto max-w-[1180px]" : "mx-auto max-w-xl"}>
              <h1 className="text-3xl font-bold">
                {step === 1
                  ? tText("Let's build your workspace")
                  : step === 2
                    ? tText("Build your organization")
                    : step === 3
                      ? tText("Add your first office")
                      : step === 4
                        ? tText("Define your working week")
                        : step === 5
                          ? tText("Define attendance policy")
                          : tText("Invite your HR team")}
              </h1>
              <p className="mb-8 mt-2 text-on-surface-variant">
                {tText("Your progress is saved after every step, so you can safely return later.")}
              </p>
              {step === 1 && (
                <div className="grid gap-6">
                  <label className="flex cursor-pointer items-center gap-5 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-5">
                    <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-variant text-[#151515]">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt={tText("Company logo preview")}
                          className="size-full object-contain"
                        />
                      ) : (
                        <UploadCloud />
                      )}
                    </div>
                    <div>
                      <strong>{tText("Upload your company logo")}</strong>
                      <p className="text-sm text-outline">{tText("PNG, JPEG or WebP, up to 2 MB")}</p>
                      {settings.companyLogoKey && (
                        <p className="mt-1 text-xs font-semibold theme-tone-text theme-tone-emerald">{tText("Logo uploaded")}</p>
                      )}
                    </div>
                    <input
                      className="hidden"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])}
                    />
                  </label>
                  <Field label={tText("Timezone")}>
                    <TimezoneSelect
                      value={settings.timezone}
                      onChange={(timezone) =>
                        setSettings({
                          ...settings,
                          timezone,
                        })
                      }
                    />
                  </Field>
                </div>
              )}
              {step === 2 && (
                <OrganizationView
                  embedded
                  onReadinessChange={(organization) => setReadiness((current) => ({ ...current, organization }))}
                />
              )}
              {step === 3 && (
                <OfficesView
                  embedded
                  defaultTimezone={settings.timezone}
                  onReadinessChange={(office) => setReadiness((current) => ({ ...current, office }))}
                />
              )}
              {step === 4 && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label={tText("Working day starts")}>
                    <input
                      type="time"
                      className={inputClass}
                      value={settings.workingDayStart}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          workingDayStart: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label={tText("Working day ends")}>
                    <input
                      type="time"
                      className={inputClass}
                      value={settings.workingDayEnd}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          workingDayEnd: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <WeeklyOffEditor
                      mode="compact"
                      value={settings.weeklyOffs}
                      onChange={(weeklyOffs) => setSettings({ ...settings, weeklyOffs })}
                    />
                  </div>
                </div>
              )}
              {step === 5 && (
                <div className="grid gap-6">
                  <Toggle
                    helpKey="selfie-verification"
                    label={tText("Require facial recognition")}
                    checked={settings.requireFacialRecognition}
                    onChange={(checked) =>
                      setSettings({
                        ...settings,
                        requireFacialRecognition: checked,
                      })
                    }
                  />
                  {settings.requireFacialRecognition && (
                    <Field
                      helpKey="selfie-verification"
                      label={`Face match threshold · ${settings.faceMatchThreshold}%`}
                    >
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="accent-primary"
                        value={settings.faceMatchThreshold}
                        onChange={(event) =>
                          setSettings({
                            ...settings,
                            faceMatchThreshold: Number(event.target.value),
                          })
                        }
                      />
                    </Field>
                  )}
                  <Toggle
                    helpKey="background-tracking"
                    label={tText("Enable GPS field tracking")}
                    checked={settings.fieldTrackingEnabled}
                    onChange={(checked) =>
                      setSettings({
                        ...settings,
                        fieldTrackingEnabled: checked,
                      })
                    }
                  />
                  {settings.fieldTrackingEnabled && (
                    <Field helpKey="background-tracking" label={tText("Field tracking interval (minutes)")}>
                      <input
                        type="number"
                        className={inputClass}
                        value={settings.fieldTrackingIntervalMin}
                        onChange={(event) =>
                          setSettings({
                            ...settings,
                            fieldTrackingIntervalMin: Number(event.target.value),
                          })
                        }
                      />
                    </Field>
                  )}
                  <Toggle
                    helpKey="attendance-defaults"
                    label={tText("Enable automatic check-in/out reminders")}
                    checked={settings.checkinReminderEnabled}
                    onChange={(checked) =>
                      setSettings({
                        ...settings,
                        checkinReminderEnabled: checked,
                      })
                    }
                  />
                  <Field helpKey="attendance-defaults" label={tText("Absentee alert time")}>
                    <input
                      type="time"
                      className={inputClass}
                      value={settings.absenteeAlertTime}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          absenteeAlertTime: event.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
              )}
              {step === 6 && (
                <div className="grid gap-5 rounded-xl border border-zinc-300 p-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-[#151515]" />
                    <strong>{tText("Business Admin is ready")}</strong>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {tText(
                      "Optionally invite your first HR administrator. When you finish setup, we'll email them a secure link to join your workspace and set up their password.",
                    )}
                  </p>
                  <Field label={tText("HR administrator email (optional)")}>
                    <input
                      type="email"
                      className={inputClass}
                      placeholder={tText("hr@company.com")}
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                    />
                  </Field>
                  <div className="grid gap-2 border-t border-surface-variant pt-4 text-sm">
                    {stepDefinitions.slice(0, 5).map(({ key, label }) => (
                      <div className="flex items-center justify-between" key={key}>
                        <span>{label}</span>
                        <span className="inline-flex items-center gap-1 font-semibold theme-tone-text theme-tone-emerald">
                          <Check className="size-4" /> {tText("Ready")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-10 flex items-center justify-between">
                <button className="text-sm font-medium text-outline" onClick={() => step > 1 && setStep(step - 1)}>
                  {tText("Back")}
                </button>
                <PrimaryButton disabled={saving || !currentStepReady} onClick={continueSetup}>
                  {saving ? tText("Saving...") : step === 6 ? tText("Finish setup") : tText("Continue")}
                  <ChevronRight className="size-4" />
                </PrimaryButton>
              </div>
            </div>
          </section>
          {!embeddedSetupStep && (
            <aside className="hidden items-center justify-center bg-zinc-50 p-12 lg:flex">
              <div className="w-full rounded-3xl border border-white bg-white/70 p-10 shadow-2xl">
                <div
                  className={`grid aspect-video place-items-center rounded-2xl ${logoPreview ? "bg-white p-4 border border-zinc-200" : "bg-gradient-to-br from-primary to-emerald-300"}`}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt={tText("Company logo preview")} className="size-full object-contain" />
                  ) : (
                    <Building2 className="size-24 text-white" />
                  )}
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#151515]">
                  {tText("Enterprise grade")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{tText("Ready to scale with you.")}</h2>
                <p className="mt-3 text-on-surface-variant">
                  {tText("Configure attendance once, then apply it consistently across every team and office.")}
                </p>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export function CompanySettingsView() {
  const { tText } = useTenantLocalization();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  useUnsavedChanges(dirty);
  useEffect(() => {
    apiClient
      .get("/tenant-settings")
      .then(({ data }) => {
        setSettings({ ...defaultSettings, ...data.data });
        setLogoPreview(data.data?.logoUrl ?? "");
        setDirty(false);
      })
      .catch(() => setError(tText("Company settings could not be loaded.")));
  }, []);
  function change(patch: Partial<Settings>) {
    setSettings((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setSaved(false);
  }
  async function save() {
    if (!settings) return;
    setError("");
    await apiClient
      .patch("/tenant-settings", writableSettings(settings))
      .then(() => {
        setSaved(true);
        setDirty(false);
      })
      .catch(() => setError(tText("Company settings could not be saved.")));
  }
  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const result = await uploadCompanyLogo(file);
      change({ companyLogoKey: result.objectKey });
      setLogoPreview(URL.createObjectURL(file));
      if (user && result.logoUrl) setUser({ ...user, logoUrl: result.logoUrl });
    } catch {
      setError(tText("Logo upload failed. Use PNG, JPEG or WebP up to 2 MB."));
    } finally {
      setUploading(false);
    }
  }
  return (
    <AdminPage
      title={tText("Company Settings")}
      description={tText("Manage your workspace identity, timezone and working-week defaults.")}
      action={
        <PrimaryButton disabled={!dirty} onClick={save}>
          {tText("Save changes")}
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      {!settings ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <Panel className="p-7">
              <div className="grid gap-6 sm:grid-cols-2">
                <Field label={tText("Timezone")}>
                  <TimezoneSelect value={settings.timezone} onChange={(timezone) => change({ timezone })} />
                </Field>
                <Field label={tText("Absentee alert time")}>
                  <input
                    type="time"
                    className={inputClass}
                    value={settings.absenteeAlertTime}
                    onChange={(e) => change({ absenteeAlertTime: e.target.value })}
                  />
                </Field>
                <Field label={tText("Working day start")}>
                  <input
                    type="time"
                    className={inputClass}
                    value={settings.workingDayStart}
                    onChange={(e) => change({ workingDayStart: e.target.value })}
                  />
                </Field>
                <Field label={tText("Working day end")}>
                  <input
                    type="time"
                    className={inputClass}
                    value={settings.workingDayEnd}
                    onChange={(e) => change({ workingDayEnd: e.target.value })}
                  />
                </Field>
              </div>
              <div className="mt-8">
                <WeeklyOffEditor
                  mode="advanced"
                  value={settings.weeklyOffs}
                  onChange={(weeklyOffs) => change({ weeklyOffs })}
                />
              </div>
              {saved && <p className="mt-4 text-sm font-medium theme-tone-text theme-tone-emerald">{tText("Settings saved.")}</p>}
            </Panel>
            <Panel className="p-7">
              <h2 className="font-semibold">{tText("Company logo")}</h2>
              <p className="mt-1 text-xs leading-5 text-outline">
                {tText("Employees see this tenant identity after signing in. Public login remains DeltCRM branded.")}
              </p>
              <label className="mt-5 grid aspect-square max-h-56 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50">
                {logoPreview ? (
                  <img src={logoPreview} alt={tText("Company logo preview")} className="size-full object-contain p-4" />
                ) : (
                  <UploadCloud className="size-10 text-[#151515]" />
                )}
                <input
                  className="hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading}
                  onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])}
                />
              </label>
              <p className="mt-4 text-xs text-outline">
                {uploading
                  ? tText("Uploading...")
                  : settings.companyLogoKey
                    ? tText("Private logo uploaded.")
                    : tText("Private, tenant-prefixed uploads only.")}
              </p>
            </Panel>
          </div>
          {dirty && (
            <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-300 bg-white p-4 shadow-xl">
              <p className="text-sm font-medium text-on-surface-variant">{tText("Unsaved changes detected")}</p>
              <PrimaryButton onClick={save}>{tText("Save changes")}</PrimaryButton>
            </div>
          )}
        </>
      )}
    </AdminPage>
  );
}

export function AttendanceDefaultsView() {
  const { tText } = useTenantLocalization();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  useUnsavedChanges(dirty);
  useEffect(() => {
    apiClient
      .get("/tenant-settings")
      .then(({ data }) => setSettings({ ...defaultSettings, ...data.data }))
      .catch(() => setError(tText("Attendance defaults could not be loaded.")));
  }, []);
  function change(patch: Partial<Settings>) {
    setSettings((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
    setSaved(false);
  }
  async function save() {
    if (!settings) return;
    await apiClient
      .patch("/tenant-settings", writableSettings(settings))
      .then(() => {
        setDirty(false);
        setSaved(true);
      })
      .catch(() => setError(tText("Attendance defaults could not be saved.")));
  }
  return (
    <AdminPage
      title={tText("Master Attendance & Security Policies")}
      description={tText("Set tenant-wide defaults inherited by new attendance policies.")}
      action={
        <PrimaryButton disabled={!dirty} onClick={save}>
          {tText("Save policy")}
        </PrimaryButton>
      }
    >
      {error && <ErrorState message={error} />}
      {!settings ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel className="p-7">
              <h2 className="mb-6 text-xl font-semibold">{tText("Identity verification")}</h2>
              <div className="grid gap-5">
                <Toggle
                  helpKey="selfie-verification"
                  label={tText("Require facial recognition")}
                  checked={settings.requireFacialRecognition}
                  onChange={(checked) => change({ requireFacialRecognition: checked })}
                />
                <Field helpKey="selfie-verification" label={`Face match threshold · ${settings.faceMatchThreshold}%`}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="accent-primary"
                    value={settings.faceMatchThreshold}
                    onChange={(e) => change({ faceMatchThreshold: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </Panel>
            <Panel className="p-7">
              <h2 className="mb-6 text-xl font-semibold">{tText("Automation")}</h2>
              <div className="grid gap-5">
                <Field helpKey="background-tracking" label={tText("Field tracking interval (minutes)")}>
                  <input
                    type="number"
                    className={inputClass}
                    value={settings.fieldTrackingIntervalMin}
                    onChange={(e) =>
                      change({
                        fieldTrackingIntervalMin: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Toggle
                  label={tText("Check-in reminders")}
                  checked={settings.checkinReminderEnabled}
                  onChange={(checked) => change({ checkinReminderEnabled: checked })}
                />
              </div>
            </Panel>
          </div>
          {saved && (
            <p className="mt-4 text-sm font-semibold theme-tone-text theme-tone-emerald">{tText("Attendance defaults saved.")}</p>
          )}
          {dirty && (
            <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-xl border border-zinc-300 bg-white p-4 shadow-xl">
              <span className="text-sm">{tText("Unsaved changes detected")}</span>
              <PrimaryButton onClick={save}>{tText("Save policy")}</PrimaryButton>
            </div>
          )}
        </>
      )}
    </AdminPage>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  helpKey,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helpKey?: AttendanceHelpKey;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-surface-variant p-4">
      <span className="flex items-center gap-1 text-sm font-medium">
        {label}
        {helpKey && <FeatureInfo helpKey={helpKey} />}
      </span>
      <button
        type="button"
        aria-label={label}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#151515]" : "bg-surface-variant"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

async function uploadCompanyLogo(file: File) {
  const result = await apiClient.post("/tenant-settings/logo/presign", {
    filename: file.name,
    contentType: file.type,
    fileSize: file.size,
  });
  await fetch(result.data.data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const identity = await apiClient.get<{
    workspace: { logoUrl: string | null };
  }>("/auth/me");
  return {
    ...(result.data.data as { objectKey: string; uploadUrl: string }),
    logoUrl: identity.data.workspace.logoUrl,
  };
}
