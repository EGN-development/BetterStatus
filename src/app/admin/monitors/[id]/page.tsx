import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getMonitorStats, getUptimePercent } from "@/lib/monitors/stats";
import { getSettings, publicUrl } from "@/lib/settings";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UptimeBar } from "@/components/uptime-bar";
import { ResponseChart } from "@/components/response-chart";
import { CopyField } from "@/components/copy-field";
import { monitorStatusMeta, monitorTypeMeta } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { runMonitorNow, toggleMonitor, deleteMonitor } from "../actions";
import { Play, Pause, Pencil, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MonitorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const monitor = await prisma.monitor.findUnique({
    where: { id },
    include: { channels: true },
  });
  if (!monitor) notFound();

  const [stats, uptime24, uptime7d, recent, settings] = await Promise.all([
    getMonitorStats(monitor.id, 60),
    getUptimePercent(monitor.id, 24 * 3600 * 1000),
    getUptimePercent(monitor.id, 7 * 24 * 3600 * 1000),
    prisma.monitorCheck.findMany({ where: { monitorId: monitor.id }, orderBy: { createdAt: "desc" }, take: 60 }),
    getSettings(),
  ]);

  const meta = monitorStatusMeta[monitor.status];
  const chartPoints = [...recent].reverse().map((c) => ({ t: c.createdAt.getTime(), ms: c.responseTimeMs }));
  const paused = monitor.status === "PAUSED";

  return (
    <div>
      <PageHeader
        title={monitor.name}
        description={`${monitorTypeMeta[monitor.type].label}${monitor.url ? ` · ${monitor.url}` : monitor.host ? ` · ${monitor.host}${monitor.port ? `:${monitor.port}` : ""}` : ""}`}
        action={
          <div className="flex gap-2">
            {monitor.type !== "CRON" && (
              <form action={runMonitorNow.bind(null, monitor.id)}>
                <Button type="submit" variant="outline" size="sm"><Play className="size-4" /> Run now</Button>
              </form>
            )}
            <form action={toggleMonitor.bind(null, monitor.id)}>
              <Button type="submit" variant="outline" size="sm">
                {paused ? <><Play className="size-4" /> Resume</> : <><Pause className="size-4" /> Pause</>}
              </Button>
            </form>
            <Button asChild variant="outline" size="sm"><Link href={`/admin/monitors/${monitor.id}/edit`}><Pencil className="size-4" /> Edit</Link></Button>
            <form action={deleteMonitor.bind(null, monitor.id)}>
              <Button type="submit" variant="danger" size="sm"><Trash2 className="size-4" /></Button>
            </form>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Status"><Badge tone={meta.tone}><Dot tone={meta.tone} /> {meta.label}</Badge></Stat>
        <Stat label="Uptime 24h">{uptime24 != null ? `${uptime24}%` : "—"}</Stat>
        <Stat label="Uptime 7d">{uptime7d != null ? `${uptime7d}%` : "—"}</Stat>
        <Stat label="Avg response">{stats.avgResponse != null ? `${stats.avgResponse} ms` : "—"}</Stat>
      </div>

      {monitor.type === "CRON" && monitor.heartbeatToken && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Heartbeat URL</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-2 text-sm text-muted-foreground">Ping this URL from your cron job on each run:</p>
            <CopyField value={`${publicUrl(settings)}/api/heartbeat/${monitor.heartbeatToken}`} />
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle>Recent uptime</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UptimeBar history={stats.slots.length ? stats.slots : Array.from({ length: 60 }, () => ({ v: -1 }))} />
          <ResponseChart points={chartPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent checks</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No checks recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recent.slice(0, 20).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2">
                    <Dot tone={c.up ? "success" : "danger"} />
                    <span className="text-muted-foreground">{c.message}</span>
                  </span>
                  <span className="flex items-center gap-4 text-xs text-muted-foreground">
                    {c.responseTimeMs != null && <span className="tabular-nums">{c.responseTimeMs}ms</span>}
                    <span>{relativeTime(c.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{children}</div>
    </Card>
  );
}
