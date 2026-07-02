import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge } from "@/components/gauge";
import { relativeTime } from "@/lib/utils";
import { createPool, deletePool } from "./actions";
import { Plus, Server, Boxes, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const [agents, pools] = await Promise.all([
    prisma.agent.findMany({
      orderBy: { createdAt: "asc" },
      include: { metrics: { orderBy: { createdAt: "desc" }, take: 1 }, pool: true },
    }),
    prisma.pool.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { agents: true } } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Servers"
        description="Install the agent to track CPU, memory, disk and network. Group servers into pools (clusters)."
        action={<Button asChild><Link href="/admin/agents/new"><Plus className="size-4" /> Add server</Link></Button>}
      />

      {/* pools manager */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Boxes className="size-4" /> Pools</div>
        {pools.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {pools.map((p) => (
              <span key={p.id} className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm">
                {p.name}
                <span className="text-xs text-muted-foreground">{p._count.agents}</span>
                <form action={deletePool.bind(null, p.id)}>
                  <button type="submit" className="text-muted-foreground hover:text-danger" title="Delete pool"><Trash2 className="size-3.5" /></button>
                </form>
              </span>
            ))}
          </div>
        )}
        <form action={createPool} className="flex flex-col gap-2 sm:flex-row">
          <Input name="poolName" placeholder="Pool name (e.g. EU cluster)" className="sm:max-w-xs" required />
          <Input name="poolDescription" placeholder="Description (optional)" className="flex-1" />
          <Button type="submit" variant="outline"><Plus className="size-4" /> Add pool</Button>
        </form>
      </Card>

      {agents.length === 0 ? (
        <Card className="flex h-48 flex-col items-center justify-center gap-3 text-center">
          <Server className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No servers yet. Add one to get an install command.</p>
          <Button asChild><Link href="/admin/agents/new"><Plus className="size-4" /> Add a server</Link></Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => {
            const m = a.metrics[0];
            const memPct = m && m.memTotal > 0n ? Number((m.memUsed * 100n) / m.memTotal) : null;
            const diskPct = m && m.diskTotal > 0n ? Number((m.diskUsed * 100n) / m.diskTotal) : null;
            return (
              <Card key={a.id} className="p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <Link href={`/admin/agents/${a.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      <Dot tone={a.online ? "success" : "danger"} /> {a.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {a.hostname ?? "—"} · {a.cpuModel ?? a.os ?? "unknown"}
                      {a.pool ? ` · ${a.pool.name}` : ""}
                    </div>
                  </div>
                  <Badge tone={a.online ? "success" : "muted"}>{a.online ? "Online" : "Offline"}</Badge>
                </div>
                <div className="space-y-3">
                  <Gauge label="CPU" pct={m ? m.cpuPct : null} />
                  <Gauge label="Memory" pct={memPct} />
                  <Gauge label="Disk" pct={diskPct} />
                </div>
                <div className="mt-4 text-xs text-muted-foreground">Last report: {relativeTime(a.lastSeenAt)}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
