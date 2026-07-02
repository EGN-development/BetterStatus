import { prisma } from "../db";

export interface MonitorStats {
  slots: { v: number; label?: string }[];
  uptime: number | null; // percent over the window
  avgResponse: number | null;
}

/** Build uptime bar slots + uptime% from the last N checks of a monitor. */
export async function getMonitorStats(monitorId: string, take = 40): Promise<MonitorStats> {
  const checks = await prisma.monitorCheck.findMany({
    where: { monitorId },
    orderBy: { createdAt: "desc" },
    take,
    select: { up: true, responseTimeMs: true, createdAt: true, message: true },
  });
  if (checks.length === 0) return { slots: [], uptime: null, avgResponse: null };

  const ordered = checks.reverse();
  const slots = ordered.map((c) => ({
    v: c.up ? 1 : 0,
    label: `${c.createdAt.toLocaleString()} — ${c.up ? "up" : "down"}${c.responseTimeMs != null ? ` (${c.responseTimeMs}ms)` : ""}`,
  }));
  const upCount = ordered.filter((c) => c.up).length;
  const uptime = Math.round((upCount / ordered.length) * 1000) / 10;
  const responses = ordered.filter((c) => c.responseTimeMs != null).map((c) => c.responseTimeMs!);
  const avgResponse = responses.length
    ? Math.round(responses.reduce((a, b) => a + b, 0) / responses.length)
    : null;
  return { slots, uptime, avgResponse };
}

/** Response time (ms) above which an "up" check counts as degraded (yellow). */
export const DEGRADED_MS = 1000;

export type UptimeRange = "24h" | "7d" | "30d" | "90d";

const RANGE_CFG: Record<UptimeRange, { unit: "hour" | "day"; count: number }> = {
  "24h": { unit: "hour", count: 24 },
  "7d": { unit: "day", count: 7 },
  "30d": { unit: "day", count: 30 },
  "90d": { unit: "day", count: 90 },
};

export interface BucketIncident {
  title: string;
  resolvedAfterSec: number | null; // null = still ongoing
  maintenance: boolean;
}

export interface UptimeBucket {
  key: string;
  label: string;
  status: "up" | "partial" | "down" | "none";
  // fractions of the bucket (0-100), summing to ~100 when there is data
  healthy: number; // up & fast
  degraded: number; // up & slow
  down: number;
  pct: number | null; // uptime % (up / total)
  incidents: BucketIncident[];
}

function floorTo(date: Date, unit: "hour" | "day"): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  if (unit === "day") d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Bucketed uptime for a monitor over a range. 24h → hourly, otherwise daily.
 * Each bucket carries healthy/degraded/down fractions so bars can be filled
 * proportionally. Aggregated in SQL.
 */
export async function getUptimeBuckets(
  monitorId: string,
  range: UptimeRange
): Promise<{ buckets: UptimeBucket[]; uptime: number | null }> {
  const cfg = RANGE_CFG[range];
  const now = new Date();
  const lastBucket = floorTo(now, cfg.unit);
  const since = new Date(lastBucket);
  if (cfg.unit === "hour") since.setHours(since.getHours() - (cfg.count - 1));
  else since.setDate(since.getDate() - (cfg.count - 1));

  const rows = await prisma.$queryRaw<
    { bucket: Date; total: bigint; up: bigint; slow: bigint }[]
  >`
    SELECT date_trunc(${cfg.unit}, "createdAt") AS bucket,
           count(*) AS total,
           count(*) FILTER (WHERE up) AS up,
           count(*) FILTER (WHERE up AND "responseTimeMs" > ${DEGRADED_MS}) AS slow
    FROM "MonitorCheck"
    WHERE "monitorId" = ${monitorId} AND "createdAt" >= ${since}
    GROUP BY 1
  `;

  const byKey = new Map<string, { total: number; up: number; slow: number }>();
  for (const r of rows) {
    byKey.set(new Date(r.bucket).toISOString(), {
      total: Number(r.total),
      up: Number(r.up),
      slow: Number(r.slow),
    });
  }

  // incidents affecting this monitor within the range, grouped into buckets
  const incRows = await prisma.incident.findMany({
    where: { monitorId, isPublic: true, startedAt: { gte: since } },
    orderBy: { startedAt: "asc" },
    select: { title: true, startedAt: true, resolvedAt: true, impact: true },
  });
  const incByKey = new Map<string, BucketIncident[]>();
  for (const inc of incRows) {
    const b = floorTo(inc.startedAt, cfg.unit).toISOString();
    if (!incByKey.has(b)) incByKey.set(b, []);
    incByKey.get(b)!.push({
      title: inc.title,
      resolvedAfterSec: inc.resolvedAt ? Math.round((inc.resolvedAt.getTime() - inc.startedAt.getTime()) / 1000) : null,
      maintenance: inc.impact === "MAINTENANCE",
    });
  }

  const buckets: UptimeBucket[] = [];
  let totalSum = 0;
  let upSum = 0;
  for (let i = 0; i < cfg.count; i++) {
    const d = new Date(since);
    if (cfg.unit === "hour") d.setHours(since.getHours() + i);
    else d.setDate(since.getDate() + i);
    const rec = byKey.get(d.toISOString());
    let status: UptimeBucket["status"] = "none";
    let healthy = 0;
    let degraded = 0;
    let down = 0;
    let pct: number | null = null;
    if (rec && rec.total > 0) {
      const downCount = rec.total - rec.up;
      const healthyCount = rec.up - rec.slow;
      healthy = (healthyCount / rec.total) * 100;
      degraded = (rec.slow / rec.total) * 100;
      down = (downCount / rec.total) * 100;
      pct = Math.round((rec.up / rec.total) * 1000) / 10;
      totalSum += rec.total;
      upSum += rec.up;
      status = downCount === 0 ? (rec.slow > 0 ? "partial" : "up") : rec.up === 0 ? "down" : "partial";
    }
    buckets.push({
      key: d.toISOString(),
      label:
        cfg.unit === "hour"
          ? d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      status,
      healthy,
      degraded,
      down,
      pct,
      incidents: incByKey.get(d.toISOString()) ?? [],
    });
  }
  const uptime = totalSum > 0 ? Math.round((upSum / totalSum) * 1000) / 10 : null;
  return { buckets, uptime };
}

export type DayStatus = "up" | "partial" | "down" | "none";

export interface DayUptime {
  date: string; // YYYY-MM-DD
  label: string; // human label e.g. "Mar 5"
  pct: number | null; // uptime % that day
  status: DayStatus;
}

/**
 * Daily uptime history: one bucket per day for the last `days` days.
 * Aggregated in SQL so it scales regardless of check frequency.
 */
export async function getDailyUptime(
  monitorId: string,
  days = 90
): Promise<{ days: DayUptime[]; uptime: number | null }> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await prisma.$queryRaw<{ day: Date; total: bigint; up: bigint }[]>`
    SELECT date_trunc('day', "createdAt") AS day,
           count(*) AS total,
           count(*) FILTER (WHERE up) AS up
    FROM "MonitorCheck"
    WHERE "monitorId" = ${monitorId} AND "createdAt" >= ${since}
    GROUP BY 1
  `;

  const byDay = new Map<string, { total: number; up: number }>();
  for (const r of rows) {
    const key = new Date(r.day).toISOString().slice(0, 10);
    byDay.set(key, { total: Number(r.total), up: Number(r.up) });
  }

  const out: DayUptime[] = [];
  let totalSum = 0;
  let upSum = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const rec = byDay.get(key);
    let status: DayStatus = "none";
    let pct: number | null = null;
    if (rec && rec.total > 0) {
      pct = Math.round((rec.up / rec.total) * 1000) / 10;
      totalSum += rec.total;
      upSum += rec.up;
      status = rec.up === rec.total ? "up" : rec.up === 0 ? "down" : "partial";
    }
    out.push({
      date: key,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      pct,
      status,
    });
  }
  const uptime = totalSum > 0 ? Math.round((upSum / totalSum) * 1000) / 10 : null;
  return { days: out, uptime };
}

/** Uptime percentage over a time window (e.g. last 24h). */
export async function getUptimePercent(monitorId: string, sinceMs: number): Promise<number | null> {
  const since = new Date(Date.now() - sinceMs);
  const [total, up] = await Promise.all([
    prisma.monitorCheck.count({ where: { monitorId, createdAt: { gte: since } } }),
    prisma.monitorCheck.count({ where: { monitorId, createdAt: { gte: since }, up: true } }),
  ]);
  if (total === 0) return null;
  return Math.round((up / total) * 1000) / 10;
}
