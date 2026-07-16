"use client";
/* eslint-disable @next/next/no-img-element -- Blob previews cannot use the image optimizer. */

import { Building2, Check, ChevronRight, ShieldCheck, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { AdminPage, ErrorState, Field, LoadingState, Panel, PrimaryButton, inputClass } from "./page-primitives";

type Settings = {
  timezone: string;
  weeklyOffs: Array<string | { weekday: string; occurrences?: number[] }>;
  workingDayStart: string;
  workingDayEnd: string;
  requireFacialRecognition: boolean;
  faceMatchThreshold: number;
  fieldTrackingIntervalMin: number;
  checkinReminderEnabled: boolean;
  checkoutReminderMinutes: number;
  absenteeAlertTime: string;
  onboardingStep: number;
  companyLogoKey?: string;
};

const defaultSettings: Settings = {
  timezone: "Asia/Kolkata",
  weeklyOffs: [{ weekday: "SAT", occurrences: [2, 4] }, "SUN"],
  workingDayStart: "09:00",
  workingDayEnd: "18:00",
  requireFacialRecognition: false,
  faceMatchThreshold: 85,
  fieldTrackingIntervalMin: 15,
  checkinReminderEnabled: true,
  checkoutReminderMinutes: 15,
  absenteeAlertTime: "10:00",
  onboardingStep: 1,
};

function writableSettings(settings: Settings) {
  const {
    timezone,
    weeklyOffs,
    workingDayStart,
    workingDayEnd,
    requireFacialRecognition,
    faceMatchThreshold,
    fieldTrackingIntervalMin,
    checkinReminderEnabled,
    checkoutReminderMinutes,
    absenteeAlertTime,
    onboardingStep,
  } = settings;

  return {
    timezone,
    weeklyOffs,
    workingDayStart,
    workingDayEnd,
    requireFacialRecognition,
    faceMatchThreshold,
    fieldTrackingIntervalMin,
    checkinReminderEnabled,
    checkoutReminderMinutes,
    absenteeAlertTime,
    onboardingStep,
  };
}

export function OnboardingWizard() {
  const router = useRouter();
  const { accessToken, hasHydrated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (hasHydrated && !accessToken) router.replace("/login");
    if (!accessToken) return;
    Promise.all([apiClient.get("/onboarding/status"), apiClient.get("/tenant-settings"), apiClient.get("/roles")])
      .then(([status, current, roleResult]) => {
        if (status.data.data.completed) router.replace("/app");
        setStep(status.data.data.currentStep || 1);
        if (current.data.data) setSettings({ ...defaultSettings, ...current.data.data });
        setRoles(roleResult.data.data);
      })
      .catch(() => setError("We couldn't load your setup progress."))
      .finally(() => setLoading(false));
  }, [accessToken, hasHydrated, router]);

  async function continueSetup() {
    setSaving(true); setError("");
    try {
      if (step === 4) {
        if (inviteEmail) {
          const hrRole = roles.find(({ name }) => name === "HR_ADMIN");
          if (!hrRole) throw new Error("HR role unavailable");
          await apiClient.post("/users/invitations", { email: inviteEmail, roleIds: [hrRole.id] });
        }
        await apiClient.post("/onboarding/complete", { progress: { completedSteps: 4 } });
        router.replace("/app");
        return;
      }
      const next = step + 1;
      await apiClient.patch("/tenant-settings", {
        ...writableSettings(settings),
        onboardingStep: next,
      });
      setStep(next);
    } catch { setError("Your progress could not be saved. Please try again."); }
    finally { setSaving(false); }
  }

  async function uploadLogo(file: File) {
    setError("");
    try {
      const result = await uploadCompanyLogo(file);
      setSettings((current) => ({ ...current, companyLogoKey: result.objectKey }));
      setLogoPreview(URL.createObjectURL(file));
    } catch { setError("Logo upload failed. Use PNG, JPEG or WebP up to 2 MB."); }
  }

  if (!hasHydrated || loading) return <div className="min-h-screen bg-[#fcf8ff] p-12"><LoadingState /></div>;
  return <div className="min-h-screen bg-[#fcf8ff] text-[#1b1b24]">
    <header className="flex h-20 items-center justify-between border-b border-[#e4e1ee] bg-white px-8"><div className="flex items-center gap-4"><strong className="text-xl text-[#3525cd]">IndigoHR</strong><span className="h-6 w-px bg-[#c7c4d8]" /><span className="text-sm text-[#464555]">Setup Wizard</span></div><span className="text-sm text-[#777587]">Support</span></header>
    <main className="mx-auto max-w-[1440px] px-6 py-12">
      <div className="mx-auto mb-12 flex max-w-[800px] items-start">
        {["Company profile", "Working days", "Verification rules", "Invite HR"].map((label, index) => <div key={label} className="flex flex-1 items-start last:flex-none"><div className="grid justify-items-center gap-2"><div className={`grid size-10 place-items-center rounded-full font-bold ${index + 1 <= step ? "bg-[#3525cd] text-white" : "bg-[#e4e1ee] text-[#464555]"}`}>{index + 1 < step ? <Check className="size-4" /> : index + 1}</div><span className={`whitespace-nowrap text-xs font-semibold ${index + 1 === step ? "text-[#3525cd]" : "text-[#777587]"}`}>{label}</span></div>{index < 3 && <div className={`mt-5 h-0.5 flex-1 ${index + 1 < step ? "bg-[#3525cd]" : "bg-[#e4e1ee]"}`} />}</div>)}
      </div>
      {error && <div className="mx-auto mb-4 max-w-[1200px]"><ErrorState message={error} /></div>}
      <div className="mx-auto grid min-h-[600px] max-w-[1200px] overflow-hidden rounded-xl border border-[#e4e1ee] bg-white shadow-xl lg:grid-cols-[1.1fr_.9fr]">
        <section className="p-8 lg:p-16"><div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-bold">{step === 1 ? "Let's build your workspace" : step === 2 ? "Define your working week" : step === 3 ? "Set verification defaults" : "Invite your HR team"}</h1>
          <p className="mb-8 mt-2 text-[#464555]">Your progress is saved after every step, so you can safely return later.</p>
          {step === 1 && <div className="grid gap-6"><label className="flex cursor-pointer items-center gap-5 rounded-xl border-2 border-dashed border-[#c7c4d8] bg-[#f5f2ff] p-5"><div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#e4e1ee] text-[#3525cd]">{logoPreview ? <img src={logoPreview} alt="Company logo preview" className="size-full object-contain" /> : <UploadCloud />}</div><div><strong>Upload your company logo</strong><p className="text-sm text-[#777587]">PNG, JPEG or WebP, up to 2 MB</p>{settings.companyLogoKey && <p className="mt-1 text-xs font-semibold text-[#006e2d]">Logo uploaded</p>}</div><input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && uploadLogo(event.target.files[0])} /></label><Field label="Timezone"><input className={inputClass} value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></Field></div>}
          {step === 2 && <div className="grid gap-6 sm:grid-cols-2"><Field label="Working day starts"><input type="time" className={inputClass} value={settings.workingDayStart} onChange={(event) => setSettings({ ...settings, workingDayStart: event.target.value })} /></Field><Field label="Working day ends"><input type="time" className={inputClass} value={settings.workingDayEnd} onChange={(event) => setSettings({ ...settings, workingDayEnd: event.target.value })} /></Field><div className="sm:col-span-2"><WeeklyOffEditor value={settings.weeklyOffs} onChange={(weeklyOffs) => setSettings({ ...settings, weeklyOffs })} /></div></div>}
          {step === 3 && <div className="grid gap-6"><Toggle label="Require facial recognition" checked={settings.requireFacialRecognition} onChange={(checked) => setSettings({ ...settings, requireFacialRecognition: checked })} /><Field label={`Face match threshold · ${settings.faceMatchThreshold}%`}><input type="range" min="0" max="100" className="accent-[#3525cd]" value={settings.faceMatchThreshold} onChange={(event) => setSettings({ ...settings, faceMatchThreshold: Number(event.target.value) })} /></Field></div>}
          {step === 4 && <div className="grid gap-5 rounded-xl border border-[#c7c4d8] p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-[#3525cd]" /><strong>Business Admin is ready</strong></div><p className="text-sm text-[#464555]">Optionally invite your first HR administrator while completing setup.</p><Field label="HR administrator email (optional)"><input type="email" className={inputClass} placeholder="hr@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></Field></div>}
          <div className="mt-10 flex items-center justify-between"><button className="text-sm font-medium text-[#777587]" onClick={() => step > 1 && setStep(step - 1)}>Back</button><PrimaryButton disabled={saving} onClick={continueSetup}>{saving ? "Saving..." : step === 4 ? "Finish setup" : "Continue"}<ChevronRight className="size-4" /></PrimaryButton></div>
        </div></section>
        <aside className="hidden items-center justify-center bg-[#f0ecf9] p-12 lg:flex"><div className="w-full rounded-3xl border border-white bg-white/70 p-10 shadow-2xl"><div className="grid aspect-video place-items-center rounded-2xl bg-gradient-to-br from-[#3525cd] to-[#7cf994]"><Building2 className="size-24 text-white" /></div><p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[#3525cd]">Enterprise grade</p><h2 className="mt-2 text-2xl font-semibold">Ready to scale with you.</h2><p className="mt-3 text-[#464555]">Configure attendance once, then apply it consistently across every team and office.</p></div></aside>
      </div>
    </main>
  </div>;
}

export function CompanySettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null); const [error, setError] = useState(""); const [saved, setSaved] = useState(false); const [dirty, setDirty] = useState(false); const [logoPreview, setLogoPreview] = useState(""); const [uploading, setUploading] = useState(false);
  useUnsavedChanges(dirty);
  useEffect(() => { apiClient.get("/tenant-settings").then(({ data }) => { setSettings({ ...defaultSettings, ...data.data }); setDirty(false); }).catch(() => setError("Company settings could not be loaded.")); }, []);
  function change(patch: Partial<Settings>) { setSettings((current) => current ? { ...current, ...patch } : current); setDirty(true); setSaved(false); }
  async function save() { if (!settings) return; setError(""); await apiClient.patch("/tenant-settings", writableSettings(settings)).then(() => { setSaved(true); setDirty(false); }).catch(() => setError("Company settings could not be saved.")); }
  async function upload(file: File) { setUploading(true); setError(""); try { const result = await uploadCompanyLogo(file); change({ companyLogoKey: result.objectKey }); setLogoPreview(URL.createObjectURL(file)); } catch { setError("Logo upload failed. Use PNG, JPEG or WebP up to 2 MB."); } finally { setUploading(false); } }
  return <AdminPage title="Company Settings" description="Manage your workspace identity, timezone and working-week defaults." action={<PrimaryButton disabled={!dirty} onClick={save}>Save changes</PrimaryButton>}>{error && <ErrorState message={error} />}{!settings ? <LoadingState /> : <><div className="grid gap-6 xl:grid-cols-[1fr_360px]"><Panel className="p-7"><div className="grid gap-6 sm:grid-cols-2"><Field label="Timezone"><input className={inputClass} value={settings.timezone} onChange={(e) => change({ timezone: e.target.value })} /></Field><Field label="Absentee alert time"><input type="time" className={inputClass} value={settings.absenteeAlertTime} onChange={(e) => change({ absenteeAlertTime: e.target.value })} /></Field><Field label="Working day start"><input type="time" className={inputClass} value={settings.workingDayStart} onChange={(e) => change({ workingDayStart: e.target.value })} /></Field><Field label="Working day end"><input type="time" className={inputClass} value={settings.workingDayEnd} onChange={(e) => change({ workingDayEnd: e.target.value })} /></Field></div><div className="mt-8"><WeeklyOffEditor value={settings.weeklyOffs} onChange={(weeklyOffs) => change({ weeklyOffs })} /></div>{saved && <p className="mt-4 text-sm font-medium text-[#006e2d]">Settings saved.</p>}</Panel><Panel className="p-7"><h2 className="font-semibold">Company logo</h2><label className="mt-5 grid aspect-square max-h-56 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-[#c7c4d8] bg-[#f5f2ff]">{logoPreview ? <img src={logoPreview} alt="Company logo preview" className="size-full object-contain p-4" /> : <UploadCloud className="size-10 text-[#3525cd]" />}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} /></label><p className="mt-4 text-xs text-[#777587]">{uploading ? "Uploading..." : settings.companyLogoKey ? "Private logo uploaded." : "Private, tenant-prefixed uploads only."}</p></Panel></div>{dirty && <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#c7c4d8] bg-white p-4 shadow-xl"><p className="text-sm font-medium text-[#464555]">Unsaved changes detected</p><PrimaryButton onClick={save}>Save changes</PrimaryButton></div>}</>}</AdminPage>;
}

export function AttendanceDefaultsView() {
  const [settings, setSettings] = useState<Settings | null>(null); const [error, setError] = useState(""); const [dirty, setDirty] = useState(false); const [saved, setSaved] = useState(false);
  useUnsavedChanges(dirty);
  useEffect(() => { apiClient.get("/tenant-settings").then(({ data }) => setSettings({ ...defaultSettings, ...data.data })).catch(() => setError("Attendance defaults could not be loaded.")); }, []);
  function change(patch: Partial<Settings>) { setSettings((current) => current ? { ...current, ...patch } : current); setDirty(true); setSaved(false); }
  async function save() { if (!settings) return; await apiClient.patch("/tenant-settings", writableSettings(settings)).then(() => { setDirty(false); setSaved(true); }).catch(() => setError("Attendance defaults could not be saved.")); }
  return <AdminPage title="Master Attendance & Security Policies" description="Set tenant-wide defaults inherited by new attendance policies." action={<PrimaryButton disabled={!dirty} onClick={save}>Save policy</PrimaryButton>}>{error && <ErrorState message={error} />}{!settings ? <LoadingState /> : <><div className="grid gap-6 lg:grid-cols-2"><Panel className="p-7"><h2 className="mb-6 text-xl font-semibold">Identity verification</h2><div className="grid gap-5"><Toggle label="Require facial recognition" checked={settings.requireFacialRecognition} onChange={(checked) => change({ requireFacialRecognition: checked })} /><Field label={`Face match threshold · ${settings.faceMatchThreshold}%`}><input type="range" min="0" max="100" className="accent-[#3525cd]" value={settings.faceMatchThreshold} onChange={(e) => change({ faceMatchThreshold: Number(e.target.value) })} /></Field></div></Panel><Panel className="p-7"><h2 className="mb-6 text-xl font-semibold">Automation</h2><div className="grid gap-5"><Field label="Field tracking interval (minutes)"><input type="number" className={inputClass} value={settings.fieldTrackingIntervalMin} onChange={(e) => change({ fieldTrackingIntervalMin: Number(e.target.value) })} /></Field><Toggle label="Check-in reminders" checked={settings.checkinReminderEnabled} onChange={(checked) => change({ checkinReminderEnabled: checked })} /></div></Panel></div>{saved && <p className="mt-4 text-sm font-semibold text-[#006e2d]">Attendance defaults saved.</p>}{dirty && <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-xl border border-[#c7c4d8] bg-white p-4 shadow-xl"><span className="text-sm">Unsaved changes detected</span><PrimaryButton onClick={save}>Save policy</PrimaryButton></div>}</>}</AdminPage>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e4e1ee] p-4"><span className="text-sm font-medium">{label}</span><button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#3525cd]" : "bg-[#e4e1ee]"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`} /></button></label>; }

function WeeklyOffEditor({ value, onChange }: { value: Settings["weeklyOffs"]; onChange: (value: Settings["weeklyOffs"]) => void }) {
  const sunday = value.some((item) => item === "SUN" || (typeof item === "object" && item.weekday === "SUN"));
  const saturday = value.find((item) => typeof item === "object" && item.weekday === "SAT");
  const occurrences = typeof saturday === "object" ? saturday.occurrences ?? [] : [];
  function update(nextSunday: boolean, nextOccurrences: number[]) { const next: Settings["weeklyOffs"] = []; if (nextSunday) next.push("SUN"); if (nextOccurrences.length) next.push({ weekday: "SAT", occurrences: [...nextOccurrences].sort() }); onChange(next); }
  return <div className="rounded-xl bg-[#f5f2ff] p-5"><h3 className="font-semibold">Weekly-off pattern</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sunday} onChange={(event) => update(event.target.checked, occurrences)} />Every Sunday</label>{[2, 4].map((occurrence) => <label key={occurrence} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={occurrences.includes(occurrence)} onChange={(event) => update(sunday, event.target.checked ? [...occurrences, occurrence] : occurrences.filter((item) => item !== occurrence))} />{occurrence === 2 ? "Second" : "Fourth"} Saturday</label>)}</div></div>;
}

function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

async function uploadCompanyLogo(file: File) {
  const result = await apiClient.post("/tenant-settings/logo/presign", { filename: file.name, contentType: file.type, fileSize: file.size });
  await fetch(result.data.data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return result.data.data as { objectKey: string; uploadUrl: string };
}
