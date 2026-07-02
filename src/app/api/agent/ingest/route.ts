import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings, publicUrl } from "@/lib/settings";
import { AlertMessage, dispatchToUrl } from "@/lib/notifications";
import { notifySubscribers } from "@/lib/subscribers";

export const dynamic = "force-dynamic";

function bigint(v: unknown): bigint {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? BigInt(Math.round(n)) : 0n;
}
function flt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// POST /api/agent/ingest  — receives a metrics report from a server agent.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim() || req.nextUrl.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 401 });

  const agent = await prisma.agent.findUnique({ where: { token } });
  if (!agent || !agent.active) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const cpuPct = flt(body.cpuPct);
  const memUsed = bigint(body.memUsed);
  const memTotal = bigint(body.memTotal);
  const diskUsed = bigint(body.diskUsed);
  const diskTotal = bigint(body.diskTotal);

  const wasOffline = !agent.online;
  const cpuThreads = Math.round(flt(body.cpuThreads));
  await prisma.$transaction([
    prisma.agentMetric.create({
      data: {
        agentId: agent.id,
        cpuPct,
        memUsed,
        memTotal,
        swapUsed: bigint(body.swapUsed),
        swapTotal: bigint(body.swapTotal),
        diskUsed,
        diskTotal,
        netRxBytes: bigint(body.netRxBytes),
        netTxBytes: bigint(body.netTxBytes),
        netIoBytes: bigint(body.netIoBytes),
        diskIoBytes: bigint(body.diskIoBytes),
        load1: flt(body.load1),
        load5: flt(body.load5),
        load15: flt(body.load15),
        uptimeSec: bigint(body.uptimeSec),
        procCount: Math.round(flt(body.procCount)),
      },
    }),
    prisma.agent.update({
      where: { id: agent.id },
      data: {
        online: true,
        lastSeenAt: new Date(),
        hostname: typeof body.hostname === "string" ? body.hostname : agent.hostname,
        os: typeof body.os === "string" ? body.os : agent.os,
        cpuModel: typeof body.cpuModel === "string" ? body.cpuModel : agent.cpuModel,
        cpuThreads: cpuThreads > 0 ? cpuThreads : agent.cpuThreads,
      },
    }),
    // retention: keep only the last 24h of metrics
    prisma.agentMetric.deleteMany({
      where: { agentId: agent.id, createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
    }),
  ]);

  // threshold alerts (edge-triggered against the previous report)
  await checkThresholds(agent, { cpuPct, memUsed, memTotal, diskUsed, diskTotal }, wasOffline);

  return NextResponse.json({ ok: true });
}

async function checkThresholds(
  agent: { id: string; name: string; hostname: string | null; cpuThreshold: number | null; memThreshold: number | null; diskThreshold: number | null; alertWebhookUrl: string | null; notifySubscribers: boolean },
  cur: { cpuPct: number; memUsed: bigint; memTotal: bigint; diskUsed: bigint; diskTotal: bigint },
  wasOffline: boolean
) {
  const prev = await prisma.agentMetric.findFirst({
    where: { agentId: agent.id },
    orderBy: { createdAt: "desc" },
    skip: 1, // the one before the row we just inserted
  });

  const memPct = cur.memTotal > 0n ? Number((cur.memUsed * 100n) / cur.memTotal) : 0;
  const diskPct = cur.diskTotal > 0n ? Number((cur.diskUsed * 100n) / cur.diskTotal) : 0;
  const prevMemPct = prev && prev.memTotal > 0n ? Number((prev.memUsed * 100n) / prev.memTotal) : 0;
  const prevDiskPct = prev && prev.diskTotal > 0n ? Number((prev.diskUsed * 100n) / prev.diskTotal) : 0;

  const alerts: string[] = [];
  const crossed = (val: number, prevVal: number, thr: number | null) =>
    thr != null && val >= thr && (wasOffline || prevVal < thr);

  if (crossed(cur.cpuPct, prev?.cpuPct ?? 0, agent.cpuThreshold)) alerts.push(`CPU ${cur.cpuPct.toFixed(0)}% (≥ ${agent.cpuThreshold}%)`);
  if (crossed(memPct, prevMemPct, agent.memThreshold)) alerts.push(`Memory ${memPct.toFixed(0)}% (≥ ${agent.memThreshold}%)`);
  if (crossed(diskPct, prevDiskPct, agent.diskThreshold)) alerts.push(`Disk ${diskPct.toFixed(0)}% (≥ ${agent.diskThreshold}%)`);

  if (alerts.length === 0) return;

  const settings = await getSettings();
  const msg: AlertMessage = {
    title: `⚠️ ${agent.name} resource alert`,
    body: `${agent.hostname ?? agent.name}: ${alerts.join(", ")}`,
    good: false,
    url: publicUrl(settings),
  };
  const tasks: Promise<unknown>[] = [];
  if (agent.alertWebhookUrl) tasks.push(dispatchToUrl(agent.alertWebhookUrl, msg));
  if (agent.notifySubscribers) tasks.push(notifySubscribers(msg));
  await Promise.allSettled(tasks);
}
