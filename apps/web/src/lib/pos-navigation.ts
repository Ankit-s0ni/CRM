import { LayoutDashboard, Tags, Boxes, Settings2 } from "lucide-react";

export const posWorkspaceItems = [
  { label: "Overview", href: "/app/pos", icon: LayoutDashboard },
  { label: "Categories", href: "/app/pos/categories", icon: Tags },
  { label: "Inventory", href: "/app/pos/inventory", icon: Boxes },
  { label: "Settings", href: "/app/pos/settings", icon: Settings2 },
];

export function isPosWorkspacePath(pathname: string) {
  return pathname.startsWith("/app/pos");
}

export function posTabActive(pathname: string, href: string) {
  if (href === "/app/pos") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
