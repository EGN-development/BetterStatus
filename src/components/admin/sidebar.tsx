"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  Radio,
  AlertTriangle,
  Wrench,
  Bell,
  Users,
  Server,
  Code2,
  Settings as SettingsIcon,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/monitors", label: "Monitors", icon: Radio },
  { href: "/admin/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/agents", label: "Servers", icon: Server },
  { href: "/admin/channels", label: "Notifications", icon: Bell },
  { href: "/admin/subscribers", label: "Subscribers", icon: Users },
  { href: "/admin/api", label: "API", icon: Code2 },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({
  siteName,
  userEmail,
  logout,
}: {
  siteName: string;
  userEmail: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{siteName}</div>
          <div className="text-xs text-muted-foreground">Admin</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          View status page
        </Link>
        <div className="flex items-center justify-between gap-2 px-3 py-1">
          <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
          <form action={logout}>
            <Button variant="ghost" size="icon" type="submit" title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
