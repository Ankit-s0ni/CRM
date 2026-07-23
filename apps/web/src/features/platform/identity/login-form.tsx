"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { APP_DOMAIN } from "@/lib/app-domain";
import { useAuthStore } from "@/lib/auth-store";
import { getApiErrorMessage } from "@/lib/api-error";

export function LoginForm() {
  const searchParams = useSearchParams();
  const pendingAuth = useAuthStore((state) => state.pendingAuth);
  const setPendingAuth = useAuthStore((state) => state.setPendingAuth);
  const clearPendingAuth = useAuthStore((state) => state.clearPendingAuth);
  const workspaceParam = searchParams.get("workspace");
  const workspace = workspaceParam ?? pendingAuth.workspace ?? "";
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
      router.push("/app/onboarding");
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
    <div className="w-full glass-card border border-outline-variant/30 rounded-xl p-8 flex flex-col gap-6">
      {/* Error State Variant */}
      {error && (
        <div className="flex items-center gap-4 p-4 bg-error-container text-on-error-container rounded-lg border border-error/20 animate-in fade-in slide-in-from-top-1 duration-300" id="error-banner">
          <span className="material-symbols-outlined text-error">report</span>
          <span className="font-label-md text-label-md ml-2">{error}</span>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleLogin}>
        {/* Email Field */}
        <div className="space-y-2">
          <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="email">Email Address</label>
          {workspace ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Workspace: <span className="font-medium text-on-surface">{workspace}.{APP_DOMAIN}</span>
            </p>
          ) : (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Start from your workspace invite, verification page, or company subdomain before signing in.
            </p>
          )}
          <div className="relative">
            <input 
              className="w-full h-12 px-4 pt-1 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none font-body-md text-body-md text-on-surface"
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

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="password">Password</label>
            <Link
              className="font-label-sm text-label-sm text-primary hover:underline transition-all"
              href={forgotPasswordHref}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input 
              className="w-full h-12 px-4 pr-12 pt-1 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none font-body-md text-body-md text-on-surface"
              id="password" 
              name="password" 
              placeholder="••••••••" 
              required 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-on-surface-variant transition-colors hover:text-primary"
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

        {/* Remember Me & Actions */}
        <div className="flex items-center">
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center">
              <input className="peer h-5 w-5 border-outline-variant rounded bg-surface-container-lowest text-primary focus:ring-primary transition-all cursor-pointer" type="checkbox"/>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Remember this device</span>
          </label>
        </div>

        {/* Sign In Button */}
        <button 
          className="w-full h-12 bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md rounded-lg shadow-md shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

      {/* Workspace Switcher */}
      <div className="pt-6 border-t border-outline-variant/30 text-center mt-2">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Not your workspace? 
          <Link className="text-primary font-label-md hover:underline ml-1" href="/signup">
            Switch company
          </Link>
        </p>
      </div>
    </div>
  );
}
