"use client";

import {
  Activity,
  Bell,
  Blocks,
  Building2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Languages,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { platformApiClient } from "@/lib/platform-api-client";
import { usePlatformAuthStore } from "@/lib/platform-auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { ThemeSwitcher } from "@/shared/components/theme-switcher";

const navigation = [
  { label: "Dashboard", href: "/platform", icon: LayoutDashboard, enabled: true, exact: true },
  { label: "Tenants", href: "/platform/tenants", icon: Building2, enabled: true },
  { label: "Plans", href: "/platform/plans", icon: CreditCard, enabled: true },
  { label: "Billing", href: "/platform/billing", icon: ClipboardList, enabled: true },
  { label: "Modules", href: "/platform/modules", icon: Blocks, enabled: true },
  { label: "Audit Logs", href: "/platform/audit", icon: ShieldCheck, enabled: true },
  { label: "Health", href: "/platform/health", icon: Activity, enabled: true },
  {
    label: "Localization",
    href: "/platform/localization",
    icon: Languages,
    enabled: true,
    permission: "platform.localization.read",
  },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    hasSession,
    clearSession,
    setSession,
    impersonation,
    clearImpersonation,
    hasHydrated,
  } = usePlatformAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && !hasSession)
      router.replace(`/platform/login?next=${encodeURIComponent(pathname)}`);
  }, [hasHydrated, hasSession, pathname, router]);

  useEffect(() => {
    if (!hasHydrated || !hasSession) return;
    platformApiClient
      .get("/platform/auth/me")
      .then(({ data }) => setSession(data))
      .catch(() => clearSession());
  }, [clearSession, hasHydrated, hasSession, setSession]);

  async function logout() {
    try {
      await platformApiClient.post("/platform/auth/logout", {});
    } finally {
      clearSession();
      router.replace("/platform/login");
    }
  }

  async function endImpersonation() {
    if (!impersonation) return;
    try { await platformApiClient.post(`/platform/impersonations/${impersonation.sessionId}/end`, { reason: "Platform operator ended the support session" }); }
    finally { clearImpersonation(); }
  }

  if (!hasHydrated || !hasSession || !user)
    return <div className="min-h-screen bg-surface" />;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {mobileOpen && (
        <button className="fixed inset-0 z-40 bg-foreground/35 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={cn("platform-sidebar fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col shadow-xl transition-transform lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-20 items-center gap-3 px-6">
          <img src="/logo-square.png" alt="DeltCRM Logo" className="size-10 object-contain" />
          <div><div className="text-lg font-bold leading-5">DeltCRM</div><div className="platform-sidebar-muted text-[10px] font-semibold uppercase tracking-[.16em]">Super Admin</div></div>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
        </div>
        <nav className="space-y-1 px-3 pt-5">
          {navigation
            .filter(
              (item) =>
                !("permission" in item) ||
                !item.permission ||
                user?.permissions.includes(item.permission),
            )
            .map((item) => {
            const active = item.enabled && (item.exact ? pathname === item.href : pathname.startsWith(item.href));
            const Icon = item.icon;
            return item.enabled ? (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={cn("platform-sidebar-item flex h-11 items-center gap-4 rounded-lg border-l-4 px-4 text-sm transition", active ? "platform-sidebar-item-active border-primary" : "platform-sidebar-muted border-transparent")}>
                <Icon className="size-[18px]" />{item.label}
              </Link>
            ) : (
              <span key={item.label} className="platform-sidebar-muted flex h-11 cursor-not-allowed items-center gap-4 border-l-4 border-transparent px-4 text-sm opacity-[.65]" title="Planned for a later Sprint 2 work package"><Icon className="size-[18px]" />{item.label}</span>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 border-t border-on-tone/10 px-3 py-5">
          <span className="platform-sidebar-muted flex h-10 items-center gap-4 px-5 text-sm"><Settings className="size-[18px]" />Settings</span>
          <button onClick={logout} className="platform-sidebar-item flex h-10 w-full items-center gap-4 px-5 text-sm"><LogOut className="size-[18px]" />Logout</button>
        </div>
      </aside>
      <div className="lg:pl-[280px]">
        <header className="platform-header sticky top-0 z-30 flex h-16 items-center border-b border-surface-variant px-4 backdrop-blur lg:px-6">
          <button className="mr-3 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div className="relative hidden w-full max-w-[460px] sm:block"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-outline" /><input className="h-10 w-full rounded-full bg-muted pl-11 pr-4 text-sm outline-none ring-ring focus:ring-2" placeholder="Search tenants, logs, or settings..." /></div>
          <div className="ml-auto flex items-center gap-5 text-on-surface-variant">
            <div className="hidden sm:block"><ThemeSwitcher /></div>
            <Bell className="size-[18px]" /><CircleHelp className="size-[18px]" /><div className="h-6 w-px bg-surface-variant" /><div className="platform-avatar grid size-8 place-items-center rounded-full text-[10px] font-bold">{user?.email.slice(0, 2).toUpperCase()}</div><div className="hidden text-right sm:block"><div className="max-w-40 truncate text-xs font-semibold">{user?.email}</div><div className="text-[10px] text-outline">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Support"}</div></div><ChevronDown className="size-4" /></div>
        </header>
        {impersonation && <div className="flex flex-wrap items-center gap-3 border-b theme-tone theme-tone-amber border px-5 py-3 text-sm"><ShieldCheck className="size-4" /><span>Impersonation session active: acting as <strong>{impersonation.targetEmail}</strong> for {impersonation.workspaceName}</span><span className="text-xs opacity-70">Ends {new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(impersonation.expiresAt))}</span><Button className="ml-auto h-8 bg-on-surface px-4 text-on-tone" onClick={endImpersonation}>Exit Session</Button></div>}
        <main>{children}</main>
      </div>
    </div>
  );
}
