"use client";

import {
  Activity,
  Bell,
  ClipboardList,
  FileText,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Package,
  Radio,
  SearchCheck,
  ServerCog,
  Truck,
  Users,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/readiness-check", label: "Readiness Check", icon: SearchCheck },
  { href: "/products", label: "Products", icon: Package },
  {
    href: "/evidence-requests",
    label: "Evidence Requests",
    icon: ClipboardList,
  },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: Gauge },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/events", label: "Events", icon: Radio },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/ops", label: "Ops", icon: ServerCog },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/api-keys", label: "API Keys", icon: KeyRound },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 w-64 border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <Activity className="mr-2 size-5 text-teal-700" />
        <div>
          <div className="text-sm font-semibold text-slate-950">
            DPP Console
          </div>
          <div className="text-xs text-slate-500">Supplier evidence ops</div>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                active && "bg-teal-50 text-teal-900",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
