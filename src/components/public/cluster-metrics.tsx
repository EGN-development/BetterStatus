import type { Lang } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import type { ClusterSnapshot, MetricPoint } from "@/lib/metrics";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Gauge } from "@/components/gauge";
import { ResponseChart } from "@/components/response-chart";
import { formatBytes, formatDuration } from "@/lib/utils";
import { ChevronDown, Cpu } from "lucide-react";

/** Per-node display flags (set on the agent in the admin). */
export interface NodeDisplay {
  cpuModel: boolean;
  cpuThreads: boolean;
  totalMemory: boolean;
  cpuUsage: boolean;
  memoryUsage: boolean;
  diskUsage: boolean;
  load: boolean;
  diskIo: boolean;
  netIo: boolean;
  uptime: boolean;
}

/** Global section + cluster-average toggles (set in Settings). */
export interface DisplayConfig {
  clusterAverages: boolean;
  nodeMetrics: boolean;
  cpuUsage: boolean;
  memoryUsage: boolean;
  diskUsage: boolean;
  load: boolean;
  diskIo: boolean;
  netIo: boolean;
}

export interface NodeData {
  id: string;
  name: string;
  hostname: string | null;
  os: string | null;
  cpuModel: string | null;
  cpuThreads: number | null;
  online: boolean;
  uptimeSec: number | null;
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  memUsed: number;
  memTotal: number;
  diskUsed: number;
  diskTotal: number;
  load: number | null;
  netIo: number;
  diskIo: number;
  series: MetricPoint[];
  show: NodeDisplay;
}

export interface ClusterData {
  id: string;
  name: string;
  description: string | null;
  snapshot: ClusterSnapshot;
  series: MetricPoint[];
  nodes: NodeData[];
}

function ioFmt(bps: number | null): string {
  if (bps == null) return "—";
  return `${formatBytes(bps)}/s`;
}
function pts(series: MetricPoint[], sel: (m: MetricPoint) => number) {
  return series.map((m) => ({ t: m.t, ms: sel(m) }));
}

export function ClusterMetrics({
  lang,
  clusters,
  display: d,
}: {
  lang: Lang;
  clusters: ClusterData[];
  display: DisplayConfig;
}) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  if (clusters.length === 0) return null;
  if (!d.clusterAverages && !d.nodeMetrics) return null;

  return (
    <div className="space-y-10">
      {clusters.map((c) => (
        <div key={c.id}>
          {/* cluster averages */}
          {d.clusterAverages && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold tracking-tight">
                  {t("cluster_title")}
                  {clusters.length > 1 && <span className="text-muted-foreground"> · {c.name}</span>}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("cluster_desc")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {d.cpuUsage && <MetricCard title={t("avg_cpu")} value={c.snapshot.cpu != null ? `${c.snapshot.cpu.toFixed(2)}%` : "—"} points={pts(c.series, (m) => m.cpu)} />}
                {d.memoryUsage && <MetricCard title={t("avg_mem")} value={c.snapshot.mem != null ? `${c.snapshot.mem.toFixed(2)}%` : "—"} points={pts(c.series, (m) => m.mem)} />}
                {d.diskUsage && <MetricCard title={t("avg_disk")} value={c.snapshot.disk != null ? `${c.snapshot.disk.toFixed(2)}%` : "—"} points={pts(c.series, (m) => m.disk)} />}
                {d.load && <MetricCard title={t("avg_load")} value={c.snapshot.load != null ? c.snapshot.load.toFixed(2) : "—"} points={pts(c.series, (m) => m.load)} />}
                {d.diskIo && <MetricCard title={t("avg_disk_io")} value={ioFmt(c.snapshot.diskIo)} points={pts(c.series, (m) => m.diskIo)} />}
                {d.netIo && <MetricCard title={t("avg_net_io")} value={ioFmt(c.snapshot.netIo)} points={pts(c.series, (m) => m.netIo)} />}
              </div>
            </>
          )}

          {/* node metrics — each node uses its own display flags */}
          {d.nodeMetrics && (
            <>
              <div className="mb-4 mt-8">
                <h3 className="text-lg font-semibold tracking-tight">{t("node_metrics_title")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("node_metrics_desc")}</p>
              </div>
              <div className="space-y-3">
                {c.nodes.map((n) => {
                  const s = n.show;
                  const sysInfo = s.cpuModel || s.cpuThreads || s.totalMemory || s.load || s.uptime;
                  const usage = s.cpuUsage || s.memoryUsage || s.diskUsage;
                  return (
                    <Card key={n.id} className="overflow-hidden">
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 hover:bg-muted/40">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Dot tone={n.online ? "success" : "danger"} />
                            <span className="truncate font-medium">{n.name}</span>
                            <span className="hidden truncate text-xs text-muted-foreground sm:inline">{n.hostname ?? n.os ?? ""}</span>
                          </span>
                          <span className="flex items-center gap-3 text-xs text-muted-foreground">
                            {s.cpuUsage && <span className="hidden tabular-nums sm:inline">CPU {n.cpu != null ? `${n.cpu.toFixed(0)}%` : "—"}</span>}
                            {s.memoryUsage && <span className="hidden tabular-nums sm:inline">{t("memory")} {n.mem != null ? `${n.mem.toFixed(0)}%` : "—"}</span>}
                            <Badge tone={n.online ? "success" : "muted"}>{n.online ? t("online") : t("offline")}</Badge>
                            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                          </span>
                        </summary>

                        <div className="space-y-6 border-t border-border p-5">
                          {(sysInfo || usage) && (
                            <div className="grid gap-6 lg:grid-cols-2">
                              {sysInfo && (
                                <div>
                                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Cpu className="size-4" /> {t("system_info")}</div>
                                  <dl className="space-y-2 text-sm">
                                    {s.cpuModel && <Row label={t("cpu_model")} value={n.cpuModel ?? "—"} />}
                                    {s.cpuThreads && <Row label={t("cpu_threads")} value={n.cpuThreads?.toString() ?? "—"} />}
                                    {s.totalMemory && <Row label={t("total_memory")} value={n.memTotal ? formatBytes(n.memTotal) : "—"} />}
                                    {s.load && <Row label={t("avg_load")} value={n.load != null ? n.load.toFixed(2) : "—"} />}
                                    {s.uptime && <Row label="Uptime" value={n.uptimeSec ? formatDuration(n.uptimeSec) : "—"} />}
                                  </dl>
                                </div>
                              )}
                              {usage && (
                                <div>
                                  <div className="mb-3 text-sm font-semibold">{t("current_usage")}</div>
                                  <div className="space-y-3">
                                    {s.cpuUsage && <Gauge label={t("cpu")} pct={n.cpu} />}
                                    {s.memoryUsage && <Gauge label={t("memory")} pct={n.mem} sub={s.totalMemory ? `${formatBytes(n.memUsed)} / ${formatBytes(n.memTotal)}` : undefined} />}
                                    {s.diskUsage && <Gauge label={t("disk")} pct={n.disk} sub={`${formatBytes(n.diskUsed)} / ${formatBytes(n.diskTotal)}`} />}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {s.cpuUsage && <Graph title={t("cpu_load")} value={n.cpu != null ? `${n.cpu.toFixed(2)}%` : "—"} points={pts(n.series, (m) => m.cpu)} />}
                            {s.memoryUsage && <Graph title={t("mem_load")} value={n.mem != null ? `${n.mem.toFixed(2)}%` : "—"} points={pts(n.series, (m) => m.mem)} />}
                            {s.diskUsage && <Graph title={t("disk_load")} value={n.disk != null ? `${n.disk.toFixed(2)}%` : "—"} points={pts(n.series, (m) => m.disk)} />}
                            {s.diskIo && <Graph title={t("disk_io")} value={ioFmt(n.diskIo)} points={pts(n.series, (m) => m.diskIo)} />}
                            {s.netIo && <Graph title={t("net_io")} value={ioFmt(n.netIo)} points={pts(n.series, (m) => m.netIo)} />}
                            {s.load && <Graph title={t("load")} value={n.load != null ? n.load.toFixed(2) : "—"} points={pts(n.series, (m) => m.load)} />}
                          </div>
                        </div>
                      </details>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, value, points }: { title: string; value: string; points: { t: number; ms: number | null }[] }) {
  return (
    <Card className="p-5">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-3 -mx-1"><ResponseChart points={points} height={56} /></div>
    </Card>
  );
}
function Graph({ title, value, points }: { title: string; value: string; points: { t: number; ms: number | null }[] }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{title}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <ResponseChart points={points} height={64} />
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
