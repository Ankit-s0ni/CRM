"use client";

import {
  ArrowLeft,
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings2,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const POS_MODULE_KEY = "POS";

const posNavigation = [
  {
    section: null,
    items: [
      { label: "Dashboard", href: "/pos", icon: LayoutDashboard, comingSoon: false },
    ],
  },
  {
    section: "Sales",
    items: [
      { label: "Billing", href: "/pos/billing", icon: ShoppingCart, comingSoon: true },
      { label: "Orders", href: "/pos/orders", icon: ClipboardList, comingSoon: true },
      { label: "Returns", href: "/pos/returns", icon: RotateCcw, comingSoon: true },
    ],
  },
  {
    section: "Catalog",
    items: [
      { label: "Products", href: "/pos/products", icon: Package, comingSoon: true },
      { label: "Categories", href: "/pos/categories", icon: FolderTree, comingSoon: true },
    ],
  },
  {
    section: "Inventory",
    items: [
      { label: "Stock Levels", href: "/pos/inventory", icon: Warehouse, comingSoon: true },
      { label: "Transfers", href: "/pos/transfers", icon: ArrowLeftRight, comingSoon: true },
    ],
  },
  {
    section: "People",
    items: [
      { label: "Customers", href: "/pos/customers", icon: Users, comingSoon: true },
      { label: "Vendors", href: "/pos/vendors", icon: Truck, comingSoon: true },
    ],
  },
  {
    section: "Insights",
    items: [
      { label: "Reports", href: "/pos/reports", icon: BarChart3, comingSoon: true },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Settings", href: "/pos/settings", icon: Settings2, comingSoon: false },
      { label: "Workflows", href: "/pos/workflows", icon: GitBranch, comingSoon: true },
    ],
  },
];

export function PosShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, hasHydrated, user, clearAuth } = useAuthStore();
  const [moduleActive, setModuleActive] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (hasHydrated && !accessToken)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [accessToken, hasHydrated, pathname, router]);

  useEffect(() => {
    if (!accessToken) return;
    apiClient
      .get<{ modules: Array<{ key: string }> }>("/workspace/modules")
      .then(({ data }) =>
        setModuleActive(
          data.modules.some(({ key }) => key === POS_MODULE_KEY),
        ),
      )
      .catch(() => setModuleActive(false));
  }, [accessToken]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!hasHydrated || !accessToken || moduleActive === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="grid size-14 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] shadow-lg shadow-blue-500/25">
            <Store className="size-7 text-white" />
          </div>
          <p className="text-sm font-medium text-slate-400">Loading Point of Sale…</p>
        </div>
      </div>
    );
  }

  if (!moduleActive) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-8">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-10 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-slate-700">
            <ShoppingCart className="size-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Point of Sale is not enabled</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            The POS module is not active for this workspace. Ask your
            administrator to enable it from Settings → Modules.
          </p>
          <Link href="/app"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white">
            <ArrowLeft className="size-4" /> Back to workspace
          </Link>
        </div>
      </main>
    );
  }

  const pageTitle = posNavigation.flatMap(s => s.items).find(i => i.href === pathname)?.label ?? "Point of Sale";

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-slate-300 shadow-xl transition-all duration-300 w-[260px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed && "lg:w-[80px]"
      )}>
        <div className={cn(
          "flex h-[72px] shrink-0 items-center overflow-hidden transition-all duration-300 gap-3 px-5",
          isCollapsed && "lg:justify-center lg:px-0"
        )}>
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] shadow-lg shadow-blue-500/20 transition-all">
            <Store className="size-5 text-white" />
          </div>
          <div className={cn(
            "whitespace-nowrap transition-all duration-300 w-auto opacity-100",
            isCollapsed && "lg:w-0 lg:opacity-0"
          )}>
            <div className="text-[15px] font-bold text-white">Point of Sale</div>
            <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">
              {user?.companyName || "DeltCRM"} workspace
            </div>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-3">
          {posNavigation.map((section, idx) => (
            <div key={idx} className="mb-2">
              {section.section && (
                <div className="min-h-6 flex items-center mt-2 mb-1">
                  <div className={cn(
                    "w-full h-px bg-slate-700/50 mx-2 hidden",
                    isCollapsed && "lg:block"
                  )} />
                  <p className={cn(
                    "px-4 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500 whitespace-nowrap transition-all duration-300",
                    isCollapsed && "lg:hidden"
                  )}>
                    {section.section}
                  </p>
                </div>
              )}
              {section.items.map(({ label, href, icon: Icon, comingSoon }) => {
                const active = !comingSoon && pathname === href;
                return (
                  <Link key={label} href={comingSoon ? "#" : href} title={isCollapsed ? label : undefined}
                    className={cn(
                      "flex min-h-10 items-center rounded-lg py-1.5 text-sm transition-all overflow-hidden whitespace-nowrap gap-3 px-4",
                      isCollapsed && "lg:justify-center lg:px-0",
                      active
                        ? "border-l-[3px] border-[#2563eb] bg-[#2563eb]/10 text-white"
                        : comingSoon
                          ? "pointer-events-none text-slate-600"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className={cn(
                      "shrink-0 transition-all size-[18px]",
                      isCollapsed && "lg:size-[20px]"
                    )} />
                    <div className={cn(
                      "flex flex-1 items-center justify-between overflow-hidden transition-all duration-300 w-auto opacity-100",
                      isCollapsed && "lg:w-0 lg:opacity-0 lg:hidden"
                    )}>
                      <span className="truncate">{label}</span>
                      {comingSoon && (
                        <span className="ml-auto shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                          Soon
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        
        {/* User Card */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <div className={cn(
            "flex items-center rounded-xl bg-white/[0.04] transition-all duration-300 p-3 gap-3",
            isCollapsed && "lg:flex-col lg:bg-transparent lg:p-0"
          )}>
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-xs font-bold text-white shadow-sm" title={isCollapsed ? user?.email : undefined}>
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            
            <div className={cn(
              "min-w-0 flex-1 transition-all duration-300",
              isCollapsed && "lg:hidden"
            )}>
              <p className="truncate text-sm font-medium text-slate-200">{user?.email}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.roles?.[0] ?? "Cashier"}</p>
            </div>
            
            <button onClick={handleLogout} title={isCollapsed ? "Logout" : undefined}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-red-400",
                isCollapsed && "lg:mt-1 lg:hover:bg-white/10"
              )}>
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex min-w-0 flex-1 flex-col transition-all duration-300 lg:pl-[260px]",
        isCollapsed && "lg:pl-[80px]"
      )}>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl lg:px-6">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5 text-slate-600" />
          </button>
          
          <button 
            className="hidden lg:flex items-center justify-center size-8 rounded-md transition-colors hover:bg-slate-100 text-slate-500" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>

          <div className="flex items-center gap-2 text-sm ml-2 lg:ml-0">
            <Store className="size-4 text-slate-400" />
            <span className="font-medium text-slate-800">{pageTitle}</span>
          </div>
          
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 sm:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              System Online
            </div>
            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-xs font-bold text-white lg:hidden">
              {user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
