import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getLang } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { getUptimeBuckets } from "@/lib/monitors/stats";
import { getMetricSeries, clusterSnapshot } from "@/lib/metrics";
import { overallStatus, incidentStatusMeta, incidentImpactMeta, monitorStatusMeta } from "@/lib/status";
import type { MonitorStatus } from "@prisma/client";
import { StatusBanner } from "@/components/public/status-banner";
import { SubscribeForm } from "@/components/public/subscribe-form";
import { LanguageToggle } from "@/components/public/language-toggle";
import { ServicesBoard, type MonitorMeta, type MonitorUptime } from "@/components/public/services-board";
import { ClusterMetrics, type ClusterData, type NodeData } from "@/components/public/cluster-metrics";
import { IncidentCard } from "@/components/public/incident-card";
import { customColorStyle } from "@/lib/custom-colors";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";
import { Activity, Rss, Bell } from "lucide-react";

export const dynamic = "force-dynamic";

const INITIAL_RANGE = "90d" as const;

const bannerLabelKey = {
  success: "all_operational",
  danger: "major_outage",
  warning: "partial_degradation",
  info: "under_maintenance",
  muted: "no_monitors",
  default: "all_operational",
} as const;

const statusLabelKey: Record<MonitorStatus, Parameters<typeof translate>[1]> = {
  UP: "operational",
  DOWN: "outage",
  PENDING: "no_data",
  PAUSED: "no_data",
  MAINTENANCE: "under_maintenance",
};

export default async function PublicStatusPage() {
  const [settings, lang] = await Promise.all([getSettings(), getLang()]);
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);

  const [monitors, activeIncidents, pastIncidents, pools, looseAgents, maintenances] = await Promise.all([
    prisma.monitor.findMany({ where: { active: true }, orderBy: [{ group: "asc" }, { createdAt: "asc" }] }),
    prisma.incident.findMany({
      where: { isPublic: true, status: { not: "RESOLVED" } },
      orderBy: { createdAt: "desc" },
      include: { updates: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.incident.findMany({
      where: { isPublic: true, status: "RESOLVED" },
      orderBy: { resolvedAt: "desc" },
      take: 8,
      include: { updates: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.pool.findMany({
      where: { isPublic: true },
      orderBy: { name: "asc" },
      include: { agents: { where: { public: true, active: true }, include: { metrics: { orderBy: { createdAt: "desc" }, take: 1 } } } },
    }),
    prisma.agent.findMany({
      where: { public: true, active: true, poolId: null },
      include: { metrics: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.maintenance.findMany({
      where: { isPublic: true, status: { not: "COMPLETED" } },
      orderBy: { scheduledStart: "asc" },
      include: { monitors: { select: { name: true } } },
    }),
  ]);

  // uptime buckets (initial 90d) for the services board
  const daily = await Promise.all(monitors.map((m) => getUptimeBuckets(m.id, INITIAL_RANGE)));
  const overall = overallStatus(monitors.map((m) => m.status));
  const withData = daily.filter((d) => d.uptime != null);
  const overallUptime = withData.length
    ? Math.round((withData.reduce((a, d) => a + (d.uptime ?? 0), 0) / withData.length) * 10) / 10
    : null;

  const monitorMeta: MonitorMeta[] = monitors.map((m) => ({
    id: m.id,
    name: m.name,
    group: m.group || t("services"),
    statusLabel: translate(lang, statusLabelKey[m.status] ?? "operational"),
    statusTone: monitorStatusMeta[m.status].tone,
  }));
  const initialData: Record<string, MonitorUptime> = {};
  monitors.forEach((m, i) => (initialData[m.id] = { uptime: daily[i].uptime, buckets: daily[i].buckets }));

  // clusters (pools + an implicit group of pool-less public nodes)
  type PoolWithAgents = (typeof pools)[number];
  const rawClusters: { id: string; name: string; description: string | null; agents: PoolWithAgents["agents"] }[] = [
    ...pools.filter((p) => p.agents.length > 0),
    ...(looseAgents.length ? [{ id: "_loose", name: t("infrastructure"), description: null, agents: looseAgents }] : []),
  ];

  const clusters: ClusterData[] = await Promise.all(
    rawClusters.map(async (c) => {
      const agentIds = c.agents.map((a) => a.id);
      const series = await getMetricSeries(agentIds);
      const nodes: NodeData[] = await Promise.all(
        c.agents.map(async (a) => {
          const m = a.metrics[0];
          const nodeSeries = await getMetricSeries([a.id]);
          return {
            id: a.id,
            name: a.name,
            hostname: a.hostname,
            os: a.os,
            cpuModel: a.cpuModel,
            cpuThreads: a.cpuThreads,
            online: a.online,
            uptimeSec: m?.uptimeSec != null ? Number(m.uptimeSec) : null,
            cpu: m ? m.cpuPct : null,
            mem: m && m.memTotal > 0n ? Number((m.memUsed * 10000n) / m.memTotal) / 100 : null,
            disk: m && m.diskTotal > 0n ? Number((m.diskUsed * 10000n) / m.diskTotal) / 100 : null,
            memUsed: m ? Number(m.memUsed) : 0,
            memTotal: m ? Number(m.memTotal) : 0,
            diskUsed: m ? Number(m.diskUsed) : 0,
            diskTotal: m ? Number(m.diskTotal) : 0,
            load: m?.load1 ?? null,
            netIo: m ? Number(m.netIoBytes) : 0,
            diskIo: m ? Number(m.diskIoBytes) : 0,
            series: nodeSeries,
            show: {
              // per-node only
              cpuModel: a.showCpuModel,
              cpuThreads: a.showCpuThreads,
              totalMemory: a.showTotalMemory,
              uptime: a.showUptime,
              // global master switch AND per-node override
              cpuUsage: a.showCpuUsage && settings.showCpuUsage,
              memoryUsage: a.showMemoryUsage && settings.showMemoryUsage,
              diskUsage: a.showDiskUsage && settings.showDiskUsage,
              load: a.showLoad && settings.showLoad,
              diskIo: a.showDiskIo && settings.showDiskIo,
              netIo: a.showNetIo && settings.showNetIo,
            },
          };
        })
      );
      return { id: c.id, name: c.name, description: c.description, snapshot: clusterSnapshot(c.agents), series, nodes };
    })
  );

  return (
    <div className="min-h-screen bg-background" style={customColorStyle(settings)}>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* header */}
        <header className="mb-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt={settings.siteName} className="size-11 rounded-2xl object-cover" />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Activity className="size-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{settings.siteName}</h1>
              <p className="text-sm text-muted-foreground">{settings.siteDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.allowSubscribers && (
              <a href="#subscribe" className="hidden items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex">
                <Bell className="size-3.5" /> {t("subscribe")}
              </a>
            )}
            <LanguageToggle lang={lang} />
          </div>
        </header>

        <StatusBanner
          tone={overall.tone}
          label={t(bannerLabelKey[overall.tone])}
          updatedAt={`${t("now")}`}
          uptime={overallUptime}
          days={90}
        />

        {/* active incidents */}
        {activeIncidents.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("active_incidents")}</h2>
            {activeIncidents.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} active defaultOpen lang={lang} />
            ))}
          </section>
        )}

        {/* scheduled maintenance */}
        {maintenances.length > 0 && (
          <section className="mt-8 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("scheduled_maintenance")}</h2>
            {maintenances.map((mw) => (
              <Card key={mw.id} className="border-l-4 border-l-info p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{mw.title}</span>
                  <Badge tone={mw.status === "IN_PROGRESS" ? "warning" : "info"}>
                    {mw.status === "IN_PROGRESS" ? t("maintenance") : t("scheduled_maintenance")}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("starts")}: {mw.scheduledStart.toLocaleString()} · {t("ends")}: {mw.scheduledEnd.toLocaleString()}
                  {mw.monitors.length > 0 && ` · ${mw.monitors.map((m) => m.name).join(", ")}`}
                </div>
                {mw.body && <p className="mt-2 text-sm text-muted-foreground">{mw.body}</p>}
              </Card>
            ))}
          </section>
        )}

        {/* services */}
        <section className="mt-8">
          {monitors.length === 0 ? (
            <Card className="flex h-32 items-center justify-center text-sm text-muted-foreground">{t("no_services")}</Card>
          ) : (
            <ServicesBoard lang={lang} monitors={monitorMeta} initialRange={INITIAL_RANGE} initialData={initialData} />
          )}
        </section>

        {/* cluster + node metrics */}
        {clusters.length > 0 && (
          <section className="mt-10">
            <ClusterMetrics
              lang={lang}
              clusters={clusters}
              display={{
                clusterAverages: settings.showClusterAverages,
                nodeMetrics: settings.showNodeMetrics,
                cpuUsage: settings.showCpuUsage,
                memoryUsage: settings.showMemoryUsage,
                diskUsage: settings.showDiskUsage,
                load: settings.showLoad,
                diskIo: settings.showDiskIo,
                netIo: settings.showNetIo,
              }}
            />
          </section>
        )}

        {/* subscribe */}
        {settings.allowSubscribers && (
          <section id="subscribe" className="mt-10 scroll-mt-8">
            <Card className="p-6">
              <h2 className="font-semibold">{t("get_updates")}</h2>
              <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("get_updates_desc")}</p>
              <SubscribeForm lang={lang} telegramEnabled={!!(settings.telegramBotToken && settings.telegramBotUsername)} />
            </Card>
          </section>
        )}

        {/* past incidents */}
        {pastIncidents.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("past_incidents")}</h2>
            <div className="space-y-3">
              {pastIncidents.map((inc) => (
                <IncidentCard key={inc.id} incident={inc} lang={lang} />
              ))}
            </div>
          </section>
        )}

        {/* footer */}
        <footer className="mt-12 flex items-center justify-between border-t border-border pt-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <Link href="/rss" className="flex items-center gap-1.5 hover:text-foreground"><Rss className="size-4" /> RSS</Link>
            <Link href="/atom" className="hover:text-foreground">Atom</Link>
          </div>
          <span>{t("powered_by")}</span>
        </footer>
      </div>
    </div>
  );
}
