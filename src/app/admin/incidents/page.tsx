import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { incidentStatusMeta, incidentImpactMeta } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const incidents = await prisma.incident.findMany({
    orderBy: { createdAt: "desc" },
    include: { monitor: true, _count: { select: { updates: true } } },
  });
  const open = incidents.filter((i) => i.status !== "RESOLVED");
  const resolved = incidents.filter((i) => i.status === "RESOLVED");

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Create incidents and publish updates to your status page."
        action={<Button asChild><Link href="/admin/incidents/new"><Plus className="size-4" /> New incident</Link></Button>}
      />

      <Section title="Active" items={open} empty="No active incidents 🎉" />
      <div className="mt-8">
        <Section title="Resolved" items={resolved} empty="No past incidents." />
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  empty,
}: {
  title: string;
  items: Awaited<ReturnType<typeof loadType>>;
  empty: string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {items.length === 0 ? (
        <Card className="flex h-24 items-center justify-center text-sm text-muted-foreground">{empty}</Card>
      ) : (
        <div className="space-y-3">
          {items.map((inc) => (
            <Card key={inc.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/incidents/${inc.id}`} className="font-medium hover:underline">{inc.title}</Link>
                <div className="text-xs text-muted-foreground">
                  {inc.monitor ? `${inc.monitor.name} · ` : ""}
                  {inc._count.updates} update(s) · {relativeTime(inc.createdAt)}
                  {inc.auto ? " · auto" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={incidentImpactMeta[inc.impact].tone}>{incidentImpactMeta[inc.impact].label}</Badge>
                <Badge tone={incidentStatusMeta[inc.status].tone}>{incidentStatusMeta[inc.status].label}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// helper only for typing the Section items
async function loadType() {
  return prisma.incident.findMany({ include: { monitor: true, _count: { select: { updates: true } } } });
}
