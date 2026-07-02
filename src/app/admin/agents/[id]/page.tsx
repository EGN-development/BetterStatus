import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings, publicUrl } from "@/lib/settings";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge } from "@/components/gauge";
import { ResponseChart } from "@/components/response-chart";
import { CopyField } from "@/components/copy-field";
import { AgentForm } from "@/components/admin/agent-form";
import { formatBytes, formatDuration, relativeTime } from "@/lib/utils";
import { updateAgent, regenerateToken, deleteAgent } from "../actions";
import { RefreshCw, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [agent, settings, pools] = await Promise.all([
    prisma.agent.findUnique({
      where: { id },
      include: { metrics: { orderBy: { createdAt: "desc" }, take: 120 } },
    }),
    getSettings(),
    prisma.pool.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!agent) notFound();

  const metrics = [...agent.metrics].reverse();
  const latest = agent.metrics[0];
  const memPct = latest && latest.memTotal > 0n ? Number((latest.memUsed * 100n) / latest.memTotal) : null;
  const diskPct = latest && latest.diskTotal > 0n ? Number((latest.diskUsed * 100n) / latest.diskTotal) : null;
  const base = publicUrl(settings);
  const installCmd = `curl -fsSL ${base}/agent/install.sh | sudo BS_URL="${base}" BS_TOKEN="${agent.token}" bash`;

  const cpuPoints = metrics.map((m) => ({ t: m.createdAt.getTime(), ms: m.cpuPct }));
  const memPoints = metrics.map((m) => ({ t: m.createdAt.getTime(), ms: m.memTotal > 0n ? Number((m.memUsed * 100n) / m.memTotal) : null }));

  return (
    <div>
      <PageHeader
        title={agent.name}
        description={`${agent.hostname ?? "—"} · ${agent.os ?? "unknown"} · last report ${relativeTime(agent.lastSeenAt)}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={agent.online ? "success" : "muted"}><Dot tone={agent.online ? "success" : "danger"} /> {agent.online ? "Online" : "Offline"}</Badge>
            <form action={deleteAgent.bind(null, agent.id)}><Button type="submit" variant="danger" size="sm"><Trash2 className="size-4" /></Button></form>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader><CardTitle>Install the agent</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Run this on the server you want to monitor (Linux, needs root for the systemd service):</p>
          <CopyField value={installCmd} />
          <form action={regenerateToken.bind(null, agent.id)}>
            <Button type="submit" variant="ghost" size="sm"><RefreshCw className="size-4" /> Regenerate token</Button>
          </form>
        </CardContent>
      </Card>

      {latest ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="p-5"><Gauge label="CPU" pct={latest.cpuPct} sub={`load ${latest.load1?.toFixed(2) ?? "—"} / ${latest.load5?.toFixed(2) ?? "—"} / ${latest.load15?.toFixed(2) ?? "—"}`} /></Card>
            <Card className="p-5"><Gauge label="Memory" pct={memPct} sub={`${formatBytes(Number(latest.memUsed))} / ${formatBytes(Number(latest.memTotal))}`} /></Card>
            <Card className="p-5"><Gauge label="Disk" pct={diskPct} sub={`${formatBytes(Number(latest.diskUsed))} / ${formatBytes(Number(latest.diskTotal))}`} /></Card>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>CPU %</CardTitle></CardHeader><CardContent><ResponseChart points={cpuPoints} /></CardContent></Card>
            <Card><CardHeader><CardTitle>Memory %</CardTitle></CardHeader><CardContent><ResponseChart points={memPoints} /></CardContent></Card>
          </div>

          <Card className="mb-6">
            <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm sm:grid-cols-4">
              <Info label="Uptime" value={latest.uptimeSec ? formatDuration(Number(latest.uptimeSec)) : "—"} />
              <Info label="Processes" value={latest.procCount?.toString() ?? "—"} />
              <Info label="Net RX" value={formatBytes(Number(latest.netRxBytes))} />
              <Info label="Net TX" value={formatBytes(Number(latest.netTxBytes))} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="mb-6 flex h-32 items-center justify-center text-sm text-muted-foreground">
          Waiting for the first report from this server…
        </Card>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Configuration</h2>
      <AgentForm action={updateAgent.bind(null, agent.id)} agent={agent} pools={pools} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
