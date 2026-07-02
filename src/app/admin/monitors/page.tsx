import Link from "next/link";
import { prisma } from "@/lib/db";
import { getMonitorStats } from "@/lib/monitors/stats";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UptimeBar } from "@/components/uptime-bar";
import { monitorStatusMeta, monitorTypeMeta } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MonitorsPage() {
  const monitors = await prisma.monitor.findMany({ orderBy: { createdAt: "asc" } });
  const stats = await Promise.all(monitors.map((m) => getMonitorStats(m.id, 40)));

  return (
    <div>
      <PageHeader
        title="Monitors"
        description="HTTP, API, ping, TCP, UDP, DNS and cron heartbeat checks."
        action={
          <Button asChild>
            <Link href="/admin/monitors/new">
              <Plus className="size-4" /> New monitor
            </Link>
          </Button>
        }
      />

      {monitors.length === 0 ? (
        <Card className="flex h-48 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">No monitors yet.</p>
          <Button asChild>
            <Link href="/admin/monitors/new">
              <Plus className="size-4" /> Create your first monitor
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {monitors.map((m, i) => {
            const meta = monitorStatusMeta[m.status];
            const s = stats[i];
            return (
              <Card key={m.id} className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex min-w-48 flex-1 items-center gap-3">
                    <Dot tone={meta.tone} />
                    <div>
                      <Link href={`/admin/monitors/${m.id}`} className="font-medium hover:underline">
                        {m.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {monitorTypeMeta[m.type].label}
                        {m.url ? ` · ${m.url}` : m.host ? ` · ${m.host}${m.port ? `:${m.port}` : ""}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="hidden w-56 sm:block">
                    <UptimeBar history={s.slots.length ? s.slots : Array.from({ length: 40 }, () => ({ v: -1 }))} />
                  </div>

                  <div className="w-20 text-right text-sm">
                    <div className="font-medium tabular-nums">{s.uptime != null ? `${s.uptime}%` : "—"}</div>
                    <div className="text-xs text-muted-foreground">uptime</div>
                  </div>

                  <div className="w-24 text-right">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <div className="mt-1 text-xs text-muted-foreground">{relativeTime(m.lastCheckedAt)}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
