"use client";
/* eslint-disable @next/next/no-img-element -- local blob previews are not optimizer-compatible. */

import { UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  AdminPage,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
} from "@/shared/components/page-primitives";
import { TimezoneSelect } from "@/shared/components/timezone-select";

type CompanySettings = {
  timezone: string;
  locale: string;
  companyLogoKey?: string | null;
  logoUrl?: string | null;
};

type NotificationPreference = {
  eventKey: string;
  channel: "IN_APP" | "EMAIL" | "PUSH";
  label: string;
  enabled: boolean;
  mandatory: boolean;
};

export function NotificationPreferencesView() {
  const { tText } = useTenantLocalization();
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get<{ data: NotificationPreference[] }>("/notification-preferences")
      .then(({ data }) => setPreferences(data.data))
      .catch(() => setError(tText("Notification preferences could not be loaded.")));
  }, []);

  async function toggle(preference: NotificationPreference) {
    if (preference.mandatory) return;
    const key = `${preference.eventKey}:${preference.channel}`;
    setSaving(key);
    setError("");
    try {
      const response = await apiClient.put<{ data: NotificationPreference[] }>("/notification-preferences", {
        preferences: [{ eventKey: preference.eventKey, channel: preference.channel, enabled: !preference.enabled }],
      });
      setPreferences(response.data.data);
    } catch {
      setError(tText("Your notification preference could not be saved."));
    } finally {
      setSaving(null);
    }
  }

  const events = preferences ? [...new Set(preferences.map(({ eventKey }) => eventKey))] : [];
  return (
    <AdminPage
      description={tText("Choose how Liqaa sends optional notices to your account. Mandatory security notices remain enabled.")}
      title={tText("My notification preferences")}
    >
      {error && <ErrorState message={error} />}
      {!preferences ? <LoadingState /> : (
        <Panel className="overflow-hidden">
          <div className="grid grid-cols-[1fr_repeat(3,80px)] border-b border-border bg-muted px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">
            <span>{tText("Notice")}</span>
            <span className="text-center">{tText("In app")}</span>
            <span className="text-center">{tText("Email")}</span>
            <span className="text-center">{tText("Push")}</span>
          </div>
          {events.map((eventKey) => {
            const rows = preferences.filter((preference) => preference.eventKey === eventKey);
            return (
              <div className="grid min-h-16 grid-cols-[1fr_repeat(3,80px)] items-center border-b border-border px-5 py-4 last:border-0" key={eventKey}>
                <div className="min-w-0 pr-3">
                  <strong className="block text-sm">{rows[0]?.label}</strong>
                  <span className="text-xs text-muted-foreground">{eventKey}</span>
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
                          className={`relative h-6 w-11 rounded-full transition ${preference.enabled ? "bg-primary" : "bg-muted"}`}
                          disabled={preference.mandatory || saving === key}
                          onClick={() => void toggle(preference)}
                          role="switch"
                          type="button"
                        >
                          <span className={`absolute top-1 size-4 rounded-full bg-card transition ${preference.enabled ? "left-6" : "left-1"}`} />
                        </button>
                      ) : <span className="text-muted-foreground">—</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Panel>
      )}
    </AdminPage>
  );
}

export function CompanySettingsView() {
  const { tText } = useTenantLocalization();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ data: Partial<CompanySettings> | null }>("/tenant-settings")
      .then(({ data }) => {
        const value = { timezone: "UTC", locale: "en", ...data.data };
        setSettings(value);
        setLogoPreview(value.logoUrl ?? "");
      })
      .catch(() => setError(tText("Company settings could not be loaded.")));
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(patch: Partial<CompanySettings>) {
    setSettings((current) => current ? { ...current, ...patch } : current);
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    setError("");
    try {
      await apiClient.patch("/tenant-settings", { timezone: settings.timezone, locale: settings.locale });
      setDirty(false);
      setSaved(true);
    } catch {
      setError(tText("Company settings could not be saved."));
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const result = await apiClient.post<{ data: { objectKey: string; uploadUrl: string } }>("/tenant-settings/logo/presign", {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      const uploadResponse = await fetch(result.data.data.uploadUrl, {
        body: file,
        headers: { "Content-Type": file.type },
        method: "PUT",
      });
      if (!uploadResponse.ok) throw new Error("Logo upload failed");
      const identity = await apiClient.get<{ workspace: { logoUrl: string | null } }>("/auth/me");
      const logoUrl = identity.data.workspace.logoUrl;
      change({ companyLogoKey: result.data.data.objectKey, logoUrl });
      setLogoPreview(URL.createObjectURL(file));
      if (user && logoUrl) setUser({ ...user, logoUrl });
    } catch {
      setError(tText("Logo upload failed. Use PNG, JPEG or WebP."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminPage
      action={<PrimaryButton disabled={!dirty} onClick={save}>{tText("Save changes")}</PrimaryButton>}
      description={tText("Manage shared workspace branding, timezone and locale. Product policies are configured inside each product.")}
      title={tText("Company settings")}
    >
      {error && <ErrorState message={error} />}
      {!settings ? <LoadingState /> : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Panel className="p-7">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label={tText("Timezone")}>
                <TimezoneSelect onChange={(timezone) => change({ timezone })} value={settings.timezone} />
              </Field>
              <Field label={tText("Default locale")}>
                <select className="h-11 w-full rounded-xl border border-border bg-card px-3" onChange={(event) => change({ locale: event.target.value })} value={settings.locale}>
                  <option value="en">{tText("English")}</option>
                  <option value="ar">العربية</option>
                </select>
              </Field>
            </div>
            {saved && <p className="mt-5 text-sm font-semibold text-primary">{tText("Settings saved.")}</p>}
          </Panel>
          <Panel className="p-7">
            <h2 className="font-semibold">{tText("Company logo")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tText("Used as the shared workspace identity across enabled products.")}</p>
            <label className="mt-5 grid aspect-square max-h-56 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted">
              {logoPreview ? <img alt={tText("Company logo preview")} className="size-full object-contain p-4" src={logoPreview} /> : <UploadCloud className="size-10 text-primary" />}
              <input accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} type="file" />
            </label>
            <p className="mt-4 text-xs text-muted-foreground">{uploading ? tText("Uploading...") : tText("PNG, JPEG or WebP.")}</p>
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}
