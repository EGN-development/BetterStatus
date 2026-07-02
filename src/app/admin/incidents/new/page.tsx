import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createIncident } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"];
const IMPACTS = ["NONE", "MINOR", "MAJOR", "CRITICAL", "MAINTENANCE"];

export default async function NewIncidentPage() {
  const monitors = await prisma.monitor.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="New incident" description="Publish an incident to your status page." />
      <form action={createIncident}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input name="title" required placeholder="Elevated API error rates" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue="INVESTIGATING">
                  {STATUSES.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Impact</Label>
                <Select name="impact" defaultValue="MINOR">
                  {IMPACTS.map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Affected monitor (optional)</Label>
                <Select name="monitorId" defaultValue="">
                  <option value="">— none —</option>
                  {monitors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Initial update</Label>
              <Textarea name="body" rows={4} placeholder="We are investigating reports of…" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPublic" defaultChecked className="size-4 accent-[var(--primary)]" />
              Show on public status page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notify" className="size-4 accent-[var(--primary)]" />
              Notify subscribers now
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit">Publish incident</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
