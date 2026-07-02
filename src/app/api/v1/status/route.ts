import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings, publicUrl } from "@/lib/settings";
import { overallStatus } from "@/lib/status";
import { getUptimePercent } from "@/lib/monitors/stats";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "no-store",
};

const indicatorMap: Record<string, string> = {
  success: "none",
  warning: "minor",
  danger: "major",
  info: "maintenance",
  muted: "none",
  default: "none",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: cors });
}

// GET /api/v1/status — public read API. Toggled + scoped in the admin.
export async function GET(req: NextRequest) {
  const s = await getSettings();
  if (!s.publicApiEnabled) {
    return NextResponse.json({ error: "API is disabled" }, { status: 404, headers: cors });
  }
  if (s.apiKey) {
    const key =
      req.nextUrl.searchParams.get("key") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (key !== s.apiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    }
  }

  const monitors = await prisma.monitor.findMany({
    where: { active: true },
    orderBy: [{ group: "asc" }, { createdAt: "asc" }],
  });
  const overall = overallStatus(monitors.map((m) => m.status));

  const out: Record<string, unknown> = {
    page: { name: s.siteName, description: s.siteDescription, url: publicUrl(s) },
    status: { indicator: indicatorMap[overall.tone] ?? "none", description: overall.label },
    updatedAt: new Date().toISOString(),
  };

  if (s.apiMonitors) {
    out.components = await Promise.all(
      monitors.map(async (m) => ({
        id: m.id,
        name: m.name,
        group: m.group || "Services",
        type: m.type,
        status: m.status.toLowerCase(),
        ...(s.apiUptime ? { uptime: await getUptimePercent(m.id, 90 * 24 * 3600 * 1000) } : {}),
      }))
    );
  }

  if (s.apiIncidents) {
    const [active, recent] = await Promise.all([
      prisma.incident.findMany({
        where: { isPublic: true, status: { not: "RESOLVED" } },
        orderBy: { createdAt: "desc" },
        include: { updates: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.incident.findMany({
        where: { isPublic: true, status: "RESOLVED" },
        orderBy: { resolvedAt: "desc" },
        take: 10,
        include: { updates: { orderBy: { createdAt: "desc" } } },
      }),
    ]);
    const mapInc = (i: (typeof active)[number]) => ({
      id: i.id,
      title: i.title,
      status: i.status.toLowerCase(),
      impact: i.impact.toLowerCase(),
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt,
      updates: i.updates.map((u) => ({ status: u.status.toLowerCase(), body: u.body, createdAt: u.createdAt })),
    });
    out.incidents = { active: active.map(mapInc), recent: recent.map(mapInc) };
  }

  if (s.apiMaintenance) {
    const mws = await prisma.maintenance.findMany({
      where: { isPublic: true, status: { not: "COMPLETED" } },
      orderBy: { scheduledStart: "asc" },
      include: { monitors: { select: { name: true } } },
    });
    out.maintenances = mws.map((m) => ({
      id: m.id,
      title: m.title,
      body: m.body,
      status: m.status.toLowerCase(),
      scheduledStart: m.scheduledStart,
      scheduledEnd: m.scheduledEnd,
      affected: m.monitors.map((x) => x.name),
    }));
  }

  if (s.apiMetrics) {
    const agents = await prisma.agent.findMany({
      where: { active: true, public: true },
      include: { metrics: { orderBy: { createdAt: "desc" }, take: 1 }, pool: { select: { name: true } } },
    });
    out.nodes = agents.map((a) => {
      const m = a.metrics[0];
      return {
        name: a.name,
        pool: a.pool?.name ?? null,
        online: a.online,
        cpuModel: a.cpuModel,
        cpuThreads: a.cpuThreads,
        cpu: m ? m.cpuPct : null,
        memPct: m && m.memTotal > 0n ? Number((m.memUsed * 10000n) / m.memTotal) / 100 : null,
        diskPct: m && m.diskTotal > 0n ? Number((m.diskUsed * 10000n) / m.diskTotal) / 100 : null,
        load: m?.load1 ?? null,
        memTotal: m ? Number(m.memTotal) : null,
        diskTotal: m ? Number(m.diskTotal) : null,
        netIoBytesPerSec: m ? Number(m.netIoBytes) : null,
        diskIoBytesPerSec: m ? Number(m.diskIoBytes) : null,
        uptimeSec: m?.uptimeSec != null ? Number(m.uptimeSec) : null,
      };
    });
  }

  return NextResponse.json(out, { headers: cors });
}
