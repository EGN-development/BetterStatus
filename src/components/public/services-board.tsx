"use client";

import { useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import type { UptimeRange, UptimeBucket } from "@/lib/monitors/stats";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "muted";

export interface MonitorMeta {
  id: string;
  name: string;
  group: string;
  statusLabel: string;
  statusTone: Tone;
}
export interface MonitorUptime {
  uptime: number | null;
  buckets: UptimeBucket[];
}

const RANGES: UptimeRange[] = ["24h", "7d", "30d", "90d"];

function humanize(sec: number, lang: Lang): string {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  if (sec < 60) return `${Math.round(sec)} ${t("d_seconds")}`;
  if (sec < 3600) return `${Math.round(sec / 60)} ${t("d_minutes")}`;
  if (sec < 86400) return `${t("about")} ${Math.round(sec / 3600)} ${t("d_hours")}`;
  return `${t("about")} ${Math.round(sec / 86400)} ${t("d_days")}`;
}

function ProportionalBar({ b, lang }: { b: UptimeBucket; lang: Lang }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  return (
    <div className="group relative h-9">
      {b.status === "none" ? (
        <div className="h-full w-full rounded-[2px] bg-muted" />
      ) : (
        <div className="flex h-full w-full flex-col-reverse overflow-hidden rounded-[2px] bg-muted">
          {b.healthy > 0 && <div className="w-full bg-success" style={{ height: `${b.healthy}%` }} />}
          {b.degraded > 0 && <div className="w-full bg-warning" style={{ height: `${b.degraded}%` }} />}
          {b.down > 0 && <div className="w-full bg-danger" style={{ height: `${b.down}%` }} />}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden min-w-[180px] max-w-[280px] -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-left shadow-xl group-hover:block">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-foreground">{b.label}</span>
          <span
            className={cn(
              "text-xs font-medium",
              b.status === "up" && "text-success",
              b.status === "partial" && "text-warning",
              b.status === "down" && "text-danger",
              b.status === "none" && "text-muted-foreground"
            )}
          >
            {b.status === "none" ? "—" : `${b.pct}%`}
          </span>
        </div>
        {b.incidents.length > 0 && (
          <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
            {b.incidents.map((inc, i) => (
              <li key={i}>
                <div className="truncate text-xs font-medium text-foreground">{inc.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {inc.maintenance ? t("maintenance") + " · " : ""}
                  {inc.resolvedAfterSec != null ? `${t("resolved_after")} ${humanize(inc.resolvedAfterSec, lang)}` : t("ongoing")}
                </div>
              </li>
            ))}
          </ul>
        )}
        <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card" />
      </div>
    </div>
  );
}

export function ServicesBoard({
  lang,
  monitors,
  initialRange,
  initialData,
}: {
  lang: Lang;
  monitors: MonitorMeta[];
  initialRange: UptimeRange;
  initialData: Record<string, MonitorUptime>;
}) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const [range, setRange] = useState<UptimeRange>(initialRange);
  const [data, setData] = useState(initialData);
  const [pending, start] = useTransition();

  function pick(r: UptimeRange) {
    if (r === range) return;
    setRange(r);
    start(async () => {
      const res = await fetch(`/api/public/uptime?range=${r}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { monitors: { id: string; uptime: number | null; buckets: UptimeBucket[] }[] };
      const map: Record<string, MonitorUptime> = {};
      for (const m of json.monitors) map[m.id] = { uptime: m.uptime, buckets: m.buckets };
      setData(map);
    });
  }

  const rangeLabel: Record<UptimeRange, string> = {
    "24h": t("range_24h"), "7d": t("range_7d"), "30d": t("range_30d"), "90d": t("range_90d"),
  };
  const leftLabel = range === "24h" ? `24 ${t("hours_ago")}` : `${range === "7d" ? 7 : range === "30d" ? 30 : 90} ${t("days_ago")}`;
  const rightLabel = range === "24h" ? t("now") : t("today");

  // group
  const groups = new Map<string, MonitorMeta[]>();
  for (const m of monitors) {
    if (!groups.has(m.group)) groups.set(m.group, []);
    groups.get(m.group)!.push(m);
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t("services")}</h2>
        <div className="flex items-center rounded-full border border-border p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => pick(r)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {rangeLabel[r]}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("space-y-7 transition-opacity", pending && "opacity-50")}>
        {[...groups.entries()].map(([group, items]) => (
          <div key={group}>
            {groups.size > 1 && (
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
            )}
            <div className="space-y-6">
              {items.map((m) => {
                const d = data[m.id];
                const buckets = d?.buckets ?? [];
                return (
                  <div key={m.id}>
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5 font-medium">
                        <Dot tone={m.statusTone} /> {m.name}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {d?.uptime != null ? `${d.uptime}%` : "—"}
                        </span>
                        <Badge tone={m.statusTone}>{m.statusLabel}</Badge>
                      </span>
                    </div>
                    <div
                      className="grid gap-[2px]"
                      style={{ gridTemplateColumns: `repeat(${buckets.length || 1}, minmax(0,1fr))` }}
                    >
                      {buckets.map((b) => <ProportionalBar key={b.key} b={b} lang={lang} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground">
        <span>{leftLabel}</span>
        <div className="flex items-center gap-3">
          <Legend className="bg-success" label={t("operational")} />
          <Legend className="bg-warning" label={t("degraded")} />
          <Legend className="bg-danger" label={t("outage")} />
          <Legend className="bg-muted" label={t("no_data")} />
        </div>
        <span>{rightLabel}</span>
      </div>
    </Card>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-[2px] ${className}`} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
