"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { APP_DOMAIN } from "@/lib/app-domain";
import { useAuthStore } from "@/lib/auth-store";
import { getApiErrorMessage } from "@/lib/api-error";
import { isAppLanguage } from "@/i18n/routing";
import { resolveTenantLoginDestination } from "@/lib/tenant-routes";

const subscribeToHostname = () => () => undefined;

function resolveHostnameWorkspace() {
  if (typeof window === "undefined") return null;

  const host = window.location.hostname;
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "";
  if (
    !appDomain ||
    host === appDomain ||
    host === `www.${appDomain}` ||
    !host.endsWith(`.${appDomain}`)
  ) {
    return null;
  }

  const subdomain = host.slice(0, host.length - appDomain.length - 1);
  return subdomain && subdomain !== "api" && subdomain !== "www"
    ? subdomain
    : null;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const pendingAuth = useAuthStore((state) => state.pendingAuth);
  const setPendingAuth = useAuthStore((state) => state.setPendingAuth);
  const clearPendingAuth = useAuthStore((state) => state.clearPendingAuth);
  const workspaceParam = searchParams.get("workspace");

  const hostnameWorkspace = useSyncExternalStore(
    subscribeToHostname,
    resolveHostnameWorkspace,
    () => null,
  );

  const workspace = workspaceParam ?? hostnameWorkspace ?? pendingAuth.workspace ?? "";
  const suppliedTenantId = searchParams.get("tenantId") ??
    (workspaceParam && workspaceParam !== pendingAuth.workspace ? "" : pendingAuth.tenantId) ?? "";
  const initialEmail = searchParams.get("email") ?? pendingAuth.email ?? "";
  const [tenantId, setTenantId] = useState(suppliedTenantId);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

  useEffect(() => {
    if (!workspace || APP_DOMAIN === "your-domain.com") return;

    const currentUrl = new URL(window.location.href);
    const sharedLoginHosts = new Set([
      APP_DOMAIN,
      `www.${APP_DOMAIN}`,
      `app.${APP_DOMAIN}`,
    ]);
    if (!sharedLoginHosts.has(currentUrl.hostname)) return;

    currentUrl.protocol = "https:";
    currentUrl.hostname = `${workspace}.${APP_DOMAIN}`;
    currentUrl.port = "";
    currentUrl.searchParams.set("workspace", workspace);
    if (suppliedTenantId)
      currentUrl.searchParams.set("tenantId", suppliedTenantId);
    if (initialEmail) currentUrl.searchParams.set("email", initialEmail);

    // Cross-origin storage is isolated, so carry the pending auth context in
    // the URL when moving from the shared login host to the tenant host.
    window.location.replace(currentUrl.toString());
  }, [initialEmail, suppliedTenantId, workspace]);

  const forgotPasswordHref = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (workspace) params.set("workspace", workspace);
    if (email) params.set("email", email);
    return params.toString() ? `/forgot-password?${params.toString()}` : "/forgot-password";
  }, [email, tenantId, workspace]);

  useEffect(() => {
    if (tenantId || workspace || initialEmail) {
      setPendingAuth({
        tenantId: tenantId || null,
        workspace: workspace || null,
        email: initialEmail || null,
      });
    }
  }, [initialEmail, setPendingAuth, tenantId, workspace]);

  async function resolveWorkspaceTenantId() {
    if (tenantId) return tenantId;
    if (!workspace) return "";

    const { data } = await axios.get(`${baseURL}/workspace/status`, {
      params: { subdomain: workspace },
    });
    if (!data.available || !data.workspace?.id) {
      const params = new URLSearchParams({
        code: data.errorCode || "WORKSPACE_UNAVAILABLE",
        workspace,
      });
      router.push(`/workspace-unavailable?${params.toString()}`);
      return "";
    }

    const resolved = String(data.workspace.id);
    setTenantId(resolved);
    setPendingAuth({ tenantId: resolved, workspace, email: email || null });
    return resolved;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginTenantId = await resolveWorkspaceTenantId();
      if (!loginTenantId) {
        setError("Open this page from your workspace invite or verification flow before signing in.");
        return;
      }

      const response = await axios.post(
        `${baseURL}/auth/login`,
        { email, password },
        {
          headers: {
            "x-tenant-id": loginTenantId,
            ...(workspace ? { "x-workspace-subdomain": workspace } : {}),
          },
        },
      );
      const { accessToken, refreshToken, user } = response.data;
      
      setAuth(user, accessToken, refreshToken);
      clearPendingAuth();
      if (workspace) {
        document.cookie = `deltcrm-workspace=${workspace}; Path=/; Max-Age=31536000; SameSite=Lax`;
      }
      const rawDefaultLanguage =
        (user as Record<string, unknown>).defaultLanguage ??
        user.localization?.defaultLanguage;
      const defaultLanguage = isAppLanguage(rawDefaultLanguage as string)
        ? (rawDefaultLanguage as "en" | "ar")
        : "en";
      const rawEnabledLanguages =
        (user as Record<string, unknown>).enabledLanguages ??
        user.localization?.enabledLanguages;
      const enabledLanguages = Array.isArray(rawEnabledLanguages)
        ? rawEnabledLanguages.filter(isAppLanguage)
        : [defaultLanguage];
      document.cookie = `deltcrm-language=${defaultLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
      const savedLanguage = document.cookie
        .split("; ")
        .find((item) => item.startsWith("deltcrm-language="))
        ?.split("=")[1];
      router.push(
        resolveTenantLoginDestination({
          nextPath: searchParams.get("next"),
          savedLanguage,
          defaultLanguage,
          enabledLanguages,
          onboardingCompletedAt: (user as Record<string, unknown>).onboardingCompletedAt as string | undefined,
        }),
      );
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Invalid email or password");

      if (message === "Tenant is suspended. Please contact billing." || message === "User account is suspended") {
        const params = new URLSearchParams({ code: "TENANT_SUSPENDED" });
        if (workspace) params.set("workspace", workspace);
        router.push(`/workspace-unavailable?${params.toString()}`);
        return;
      }

      if (message === "Workspace not found") {
        const params = new URLSearchParams({ code: "WORKSPACE_NOT_FOUND" });
        if (workspace) params.set("workspace", workspace);
        router.push(`/workspace-unavailable?${params.toString()}`);
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 rounded-lg border border-border bg-white p-6 shadow-sm sm:p-8">
      {error && (
        <div className="flex items-center gap-3 rounded-lg border theme-tone theme-tone-red border p-4 text-sm" id="error-banner" role="alert">
          <span className="material-symbols-outlined text-error">report</span>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleLogin}>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground" htmlFor="email">Email Address</label>
          {workspace ? (
            <p className="text-sm text-muted-foreground">
              Workspace: <span className="font-medium text-on-surface">{workspace}.{APP_DOMAIN}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start from your workspace invite, verification page, or company subdomain before signing in.
            </p>
          )}
          <div className="relative">
            <input
              className="h-12 w-full rounded-lg border border-border bg-background px-4 pt-1 text-sm text-foreground outline-none transition focus:border-[#151515] focus:ring-2 focus:ring-[#151515]/20" autoComplete="email" aria-describedby={error ? "error-banner" : undefined}
              id="email" 
              name="email" 
              placeholder="e.g. sarah.j@acme.com" 
              required 
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-foreground" htmlFor="password">Password</label>
            <Link
              className="text-sm font-semibold text-[#151515] transition hover:underline"
              href={forgotPasswordHref}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input 
              className="h-12 w-full rounded-lg border border-border bg-background px-4 pt-1 pr-12 text-sm text-foreground outline-none transition focus:border-[#151515] focus:ring-2 focus:ring-[#151515]/20" autoComplete="current-password" aria-describedby={error ? "error-banner" : undefined}
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-e-lg text-muted-foreground transition-colors hover:text-[#151515] focus:outline-none focus:ring-2 focus:ring-[#151515]/20"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input className="peer h-5 w-5 cursor-pointer rounded border-border bg-background text-[#151515] transition focus:ring-[#151515]" type="checkbox"/>
            </div>
            <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">Remember this device</span>
          </label>
        </div>

        <button 
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#151515] text-sm font-semibold text-on-primary shadow-sm shadow-[#151515]/20 transition hover:bg-[#2a2927] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          id="signin-btn" 
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-2 border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Not your workspace? 
          <Link className="ml-1 font-semibold text-[#151515] hover:underline" href="/signup">
            Switch company
          </Link>
        </p>
      </div>
    </div>
  );
}
