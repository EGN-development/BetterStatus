import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { monitorStatusMeta, incidentStatusMeta } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { Radio, AlertTriangle, Server, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [monitors, openIncidents, agents, recentIncidents] = await Promise.all([
    prisma.monitor.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.incident.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.agent.findMany(),
    prisma.incident.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { monitor: true },
    }),
  ]);

  const up = monitors.filter((m) => m.status === "UP").length;
  const down = monitors.filter((m) => m.status === "DOWN").length;
  const onlineAgents = agents.filter((a) => a.online).length;

  const stats = [
    { label: "Monitors", value: monitors.length, icon: Radio, tone: "default" as const },
    { label: "Operational", value: up, icon: CheckCircle2, tone: "success" as const },
    { label: "Open incidents", value: openIncidents, icon: AlertTriangle, tone: down || openIncidents ? "danger" as const : "muted" as const },
    { label: "Servers online", value: `${onlineAgents}/${agents.length}`, icon: Server, tone: "info" as const },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your monitored services." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums">{s.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Monitors</h2>
            <Link href="/admin/monitors" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </div>
          {monitors.length === 0 ? (
            <EmptyHint href="/admin/monitors" label="Add your first monitor" />
          ) : (
            <ul className="space-y-2">
              {monitors.slice(0, 8).map((m) => {
                const meta = monitorStatusMeta[m.status];
                return (
                  <li key={m.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted">
                    <div className="flex items-center gap-3">
                      <Dot tone={meta.tone} />
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.type}</span>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent incidents</h2>
            <Link href="/admin/incidents" className="text-sm text-primary hover:underline">
              All incidents
            </Link>
          </div>
          {recentIncidents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No incidents yet 🎉</p>
          ) : (
            <ul className="space-y-3">
              {recentIncidents.map((inc) => {
                const meta = incidentStatusMeta[inc.status];
                return (
                  <li key={inc.id} className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/admin/incidents/${inc.id}`} className="text-sm font-medium hover:underline">
                        {inc.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {inc.monitor ? `${inc.monitor.name} · ` : ""}
                        {relativeTime(inc.createdAt)}
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyHint({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-24 items-center justify-center rounded-[var(--radius)] border border-dashed border-border text-sm text-muted-foreground hover:text-foreground"
    >
      {label} →
    </Link>
  );
}
