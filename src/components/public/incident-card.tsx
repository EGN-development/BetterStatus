import type { Lang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Badge, Dot } from "@/components/ui/badge";
import { incidentStatusMeta, incidentImpactMeta } from "@/lib/status";
import { relativeTime } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentStatus, IncidentImpact } from "@prisma/client";

export interface PublicIncident {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  createdAt: Date;
  resolvedAt: Date | null;
  updates: { id: string; status: IncidentStatus; body: string; createdAt: Date }[];
}

export function IncidentCard({
  incident,
  active = false,
  defaultOpen = false,
}: {
  incident: PublicIncident;
  active?: boolean;
  defaultOpen?: boolean;
  lang?: Lang;
}) {
  const sMeta = incidentStatusMeta[incident.status];
  return (
    <Card className={cn("overflow-hidden", active && "border-l-4 border-l-danger")}>
      <details className="group" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 hover:bg-muted/40">
          <div className="min-w-0">
            <div className="font-medium">{incident.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {relativeTime(incident.createdAt)}
              {incident.updates[0] && ` · ${incident.updates[0].body.slice(0, 80)}${incident.updates[0].body.length > 80 ? "…" : ""}`}
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-2">
            <Badge tone={incidentImpactMeta[incident.impact].tone}>{incidentImpactMeta[incident.impact].label}</Badge>
            <Badge tone={sMeta.tone}>{sMeta.label}</Badge>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="border-t border-border p-5">
          <ol className="relative space-y-4 border-l border-border pl-5">
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
        </div>
      </details>
    </Card>
  );
}
