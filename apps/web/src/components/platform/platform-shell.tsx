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
import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Dashboard", href: "/platform", icon: LayoutDashboard, enabled: true, exact: true },
  { label: "Tenants", href: "/platform/tenants", icon: Building2, enabled: true },
  { label: "Plans", href: "/platform/plans", icon: CreditCard, enabled: false },
  { label: "Billing", href: "/platform/billing", icon: ClipboardList, enabled: false },
  { label: "Modules", href: "/platform/modules", icon: Blocks, enabled: true },
  { label: "Audit Logs", href: "/platform/audit", icon: ShieldCheck, enabled: true },
  { label: "Health", href: "/platform/health", icon: Activity, enabled: true },
];

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clearSession, impersonation, clearImpersonation } = usePlatformAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!accessToken) router.replace(`/platform/login?next=${encodeURIComponent(pathname)}`);
  }, [accessToken, pathname, router]);

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

  if (!accessToken) return <div className="min-h-screen bg-[#fcf8ff]" />;

  return (
    <div className="min-h-screen bg-[#fcf8ff] text-[#1c1b1f]">
      {mobileOpen && (
        <button className="fixed inset-0 z-40 bg-black/35 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#4f46e5] text-white shadow-xl transition-transform lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-white text-[#4f46e5]"><Building2 className="size-5" /></div>
          <div><div className="text-lg font-bold leading-5">IndigoHR</div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-indigo-100">Super Admin</div></div>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button>
        </div>
        <nav className="space-y-1 px-3 pt-5">
          {navigation.map((item) => {
            const active = item.enabled && (item.exact ? pathname === item.href : pathname.startsWith(item.href));
            const Icon = item.icon;
            return item.enabled ? (
              <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex h-11 items-center gap-4 rounded-lg border-l-4 px-4 text-sm transition", active ? "border-[#7cf994] bg-[#3525cd]/55 text-white" : "border-transparent text-indigo-100 hover:bg-white/10 hover:text-white")}>
                <Icon className="size-[18px]" />{item.label}
              </Link>
            ) : (
              <span key={item.label} className="flex h-11 cursor-not-allowed items-center gap-4 border-l-4 border-transparent px-4 text-sm text-indigo-200/65" title="Planned for a later Sprint 2 work package"><Icon className="size-[18px]" />{item.label}</span>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/10 px-3 py-5">
          <span className="flex h-10 items-center gap-4 px-5 text-sm text-indigo-200/70"><Settings className="size-[18px]" />Settings</span>
          <button onClick={logout} className="flex h-10 w-full items-center gap-4 px-5 text-sm text-indigo-100 hover:text-white"><LogOut className="size-[18px]" />Logout</button>
        </div>
      </aside>
      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#e4e1ee] bg-white/95 px-4 backdrop-blur lg:px-6">
          <button className="mr-3 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div className="relative hidden w-full max-w-[460px] sm:block"><Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#777587]" /><input className="h-10 w-full rounded-full bg-[#f5f1fb] pl-11 pr-4 text-sm outline-none ring-[#3525cd] focus:ring-2" placeholder="Search tenants, logs, or settings..." /></div>
          <div className="ml-auto flex items-center gap-5 text-[#464555]"><Bell className="size-[18px]" /><CircleHelp className="size-[18px]" /><div className="h-6 w-px bg-[#e4e1ee]" /><div className="grid size-8 place-items-center rounded-full bg-[#4f46e5] text-[10px] font-bold text-white">{user?.email.slice(0, 2).toUpperCase()}</div><div className="hidden text-right sm:block"><div className="max-w-40 truncate text-xs font-semibold">{user?.email}</div><div className="text-[10px] text-[#777587]">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Support"}</div></div><ChevronDown className="size-4" /></div>
        </header>
        {impersonation && <div className="flex flex-wrap items-center gap-3 border-b border-orange-300 bg-orange-100 px-5 py-3 text-sm text-orange-950"><ShieldCheck className="size-4" /><span>Impersonation session active: acting as <strong>{impersonation.targetEmail}</strong> for {impersonation.workspaceName}</span><span className="text-xs opacity-70">Ends {new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(impersonation.expiresAt))}</span><Button className="ml-auto h-8 bg-[#1c1b1f] px-4 text-white" onClick={endImpersonation}>Exit Session</Button></div>}
        <main>{children}</main>
      </div>
    </div>
  );
}
