import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { incidentStatusMeta, incidentImpactMeta } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { postUpdate, deleteIncident } from "../actions";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"];

export default async function IncidentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: { monitor: true, updates: { orderBy: { createdAt: "desc" } } },
  });
  if (!incident) notFound();

  return (
    <div>
      <PageHeader
        title={incident.title}
        description={incident.monitor ? `Affected: ${incident.monitor.name}` : undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={incidentImpactMeta[incident.impact].tone}>{incidentImpactMeta[incident.impact].label}</Badge>
            <Badge tone={incidentStatusMeta[incident.status].tone}>{incidentStatusMeta[incident.status].label}</Badge>
            <form action={deleteIncident.bind(null, incident.id)}>
              <Button type="submit" variant="danger" size="sm"><Trash2 className="size-4" /></Button>
            </form>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative space-y-5 border-l border-border pl-5">
              {incident.updates.map((u) => (
                <li key={u.id} className="relative">
                  <span className="absolute -left-[26px] top-1">
                    <Dot tone={incidentStatusMeta[u.status].tone} />
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge tone={incidentStatusMeta[u.status].tone}>{incidentStatusMeta[u.status].label}</Badge>
                    <span className="text-xs text-muted-foreground">{relativeTime(u.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm">{u.body}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>Post update</CardTitle></CardHeader>
          <CardContent>
            <form action={postUpdate.bind(null, incident.id)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>New status</Label>
                <Select name="status" defaultValue={incident.status === "RESOLVED" ? "MONITORING" : incident.status}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea name="body" rows={4} required placeholder="What's the latest?" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notify" className="size-4 accent-[var(--primary)]" />
                Notify subscribers
              </label>
              <Button type="submit" className="w-full">Post update</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
