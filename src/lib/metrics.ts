import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export interface MetricPoint {
  t: number;
  cpu: number;
  mem: number;
  disk: number;
  load: number;
  netIo: number; // bytes/sec
  diskIo: number; // bytes/sec
}

/**
 * 24h time-series for one or more agents, averaged into time buckets.
 * Passing several agent ids yields cluster (pool) averages.
 */
export async function getMetricSeries(
  agentIds: string[],
  bucketSec = 900 // 15-minute buckets → up to 96 points / 24h
): Promise<MetricPoint[]> {
  if (agentIds.length === 0) return [];
  const rows = await prisma.$queryRaw<
    { bucket: number; cpu: number; mem: number; disk: number; load: number; netio: number; diskio: number }[]
  >`
    SELECT floor(extract(epoch from "createdAt") / ${bucketSec}) * ${bucketSec} AS bucket,
           avg("cpuPct") AS cpu,
           avg("memUsed"::numeric / NULLIF("memTotal", 0)) * 100 AS mem,
           avg("diskUsed"::numeric / NULLIF("diskTotal", 0)) * 100 AS disk,
           avg("load1") AS load,
           avg("netIoBytes"::numeric) AS netio,
           avg("diskIoBytes"::numeric) AS diskio
    FROM "AgentMetric"
    WHERE "agentId" IN (${Prisma.join(agentIds)})
      AND "createdAt" >= now() - interval '24 hours'
    GROUP BY 1
    ORDER BY 1
  `;
  return rows.map((r) => ({
    t: Number(r.bucket) * 1000,
    cpu: Number(r.cpu) || 0,
    mem: Number(r.mem) || 0,
    disk: Number(r.disk) || 0,
    load: Number(r.load) || 0,
    netIo: Number(r.netio) || 0,
    diskIo: Number(r.diskio) || 0,
  }));
}

/** Average of the latest metric across a set of agents (current cluster snapshot). */
export interface ClusterSnapshot {
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  load: number | null;
  netIo: number | null;
  diskIo: number | null;
  nodeCount: number;
  onlineCount: number;
}

export function clusterSnapshot(
  nodes: { online: boolean; metrics: { cpuPct: number; memUsed: bigint; memTotal: bigint; diskUsed: bigint; diskTotal: bigint; load1: number | null; netIoBytes: bigint; diskIoBytes: bigint }[] }[]
): ClusterSnapshot {
  const latest = nodes.map((n) => n.metrics[0]).filter(Boolean);
  const avg = (fn: (m: (typeof latest)[number]) => number) =>
    latest.length ? latest.reduce((a, m) => a + fn(m), 0) / latest.length : null;
  return {
    cpu: avg((m) => m.cpuPct),
    mem: avg((m) => (m.memTotal > 0n ? Number((m.memUsed * 10000n) / m.memTotal) / 100 : 0)),
    disk: avg((m) => (m.diskTotal > 0n ? Number((m.diskUsed * 10000n) / m.diskTotal) / 100 : 0)),
    load: avg((m) => m.load1 ?? 0),
    netIo: avg((m) => Number(m.netIoBytes)),
    diskIo: avg((m) => Number(m.diskIoBytes)),
    nodeCount: nodes.length,
    onlineCount: nodes.filter((n) => n.online).length,
  };
}
