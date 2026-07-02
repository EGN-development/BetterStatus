import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from "lucide-react";

export const dynamic = "force-dynamic";

const tone = { SCHEDULED: "info", IN_PROGRESS: "warning", COMPLETED: "success" } as const;

export default async function MaintenancePage() {
  const items = await prisma.maintenance.findMany({
    orderBy: { scheduledStart: "desc" },
    include: { _count: { select: { monitors: true } } },
  });
  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Plan maintenance windows. Affected monitors won't open incidents while in progress."
        action={<Button asChild><Link href="/admin/maintenance/new"><Plus className="size-4" /> Schedule</Link></Button>}
      />
      {items.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Wrench className="size-6" /> No maintenance scheduled.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <Link href={`/admin/maintenance/${m.id}`} className="font-medium hover:underline">{m.title}</Link>
                <div className="text-xs text-muted-foreground">
                  {m.scheduledStart.toLocaleString()} → {m.scheduledEnd.toLocaleString()} · {m._count.monitors} monitor(s)
                </div>
              </div>
              <Badge tone={tone[m.status]}>{m.status.replace("_", " ").toLowerCase()}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
