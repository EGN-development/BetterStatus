import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { incidentStatusMeta, incidentImpactMeta } from "@/lib/status";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicIncident({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [incident, settings] = await Promise.all([
    prisma.incident.findUnique({
      where: { id },
      include: { monitor: true, updates: { orderBy: { createdAt: "desc" } } },
    }),
    getSettings(),
  ]);
  if (!incident || !incident.isPublic) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {settings.siteName}
        </Link>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{incident.title}</h1>
          <div className="flex items-center gap-2">
            <Badge tone={incidentImpactMeta[incident.impact].tone}>{incidentImpactMeta[incident.impact].label}</Badge>
            <Badge tone={incidentStatusMeta[incident.status].tone}>{incidentStatusMeta[incident.status].label}</Badge>
          </div>
        </div>
        {incident.monitor && <p className="mb-6 text-sm text-muted-foreground">Affected: {incident.monitor.name}</p>}

        <Card className="p-6">
          <ol className="relative space-y-5 border-l border-border pl-5">
            {incident.updates.map((u) => (
              <li key={u.id} className="relative">
                <span className="absolute -left-[26px] top-1"><Dot tone={incidentStatusMeta[u.status].tone} /></span>
                <div className="flex items-center gap-2">
                  <Badge tone={incidentStatusMeta[u.status].tone}>{incidentStatusMeta[u.status].label}</Badge>
                  <span className="text-xs text-muted-foreground">{u.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-1.5 text-sm">{u.body}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
