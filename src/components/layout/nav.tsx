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
import { useAuth } from "@/lib/auth/auth-provider";
import { hasScope, scopes } from "@/lib/auth/scopes";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  scope?: string;
};

const buyerNav: NavItem[] = [
  { href: "/readiness-check", label: "Readiness", icon: SearchCheck },
  { href: "/products", label: "Products", icon: Package },
  { href: "/evidence-requests", label: "Requests", icon: ClipboardList },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/reports", label: "Reports", icon: Gauge },
];

const systemNav: NavItem[] = [
  {
    href: "/documents",
    label: "Uploads",
    icon: FileText,
    scope: scopes.writeEvidence,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    scope: scopes.adminNotifications,
  },
  { href: "/events", label: "Events", icon: Radio, scope: scopes.readEvents },
  {
    href: "/webhooks",
    label: "Webhooks",
    icon: Webhook,
    scope: scopes.writeWebhooks,
  },
  { href: "/ops", label: "Ops", icon: ServerCog, scope: scopes.adminQueue },
];

const adminNav: NavItem[] = [
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    scope: scopes.adminUsers,
  },
  {
    href: "/admin/api-keys",
    label: "API Keys",
    icon: KeyRound,
    scope: scopes.adminApiKeys,
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { me } = useAuth();
  const currentScopes = me?.scopes;
  const allowed = (item: NavItem) =>
    !item.scope || hasScope(currentScopes, item.scope);
  const visibleSystem = systemNav.filter(allowed);
  const visibleAdmin = adminNav.filter(allowed);

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
      <nav className="space-y-4 p-3">
        <NavSection items={buyerNav} pathname={pathname} />
        {visibleSystem.length > 0 ? (
          <CollapsibleNavSection
            label="System"
            items={visibleSystem}
            pathname={pathname}
          />
        ) : null}
        {visibleAdmin.length > 0 ? (
          <CollapsibleNavSection
            label="Admin"
            items={visibleAdmin}
            pathname={pathname}
          />
        ) : null}
      </nav>
    </aside>
  );
}

function NavSection({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </div>
  );
}

function CollapsibleNavSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  const open = items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href),
  );
  return (
    <details className="group" open={open}>
      <summary className="flex h-8 cursor-pointer list-none items-center justify-between rounded-md px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50">
        {label}
        <span className="text-slate-400 group-open:rotate-90">›</span>
      </summary>
      <div className="mt-1 space-y-1">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} secondary />
        ))}
      </div>
    </details>
  );
}

function NavLink({
  item,
  pathname,
  secondary = false,
}: {
  item: NavItem;
  pathname: string;
  secondary?: boolean;
}) {
  const active =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950",
        secondary && "pl-5 text-slate-500",
        active && "bg-teal-50 text-teal-900",
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}
