import type { Maintenance, Monitor } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function dtLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function MaintenanceForm({
  action,
  maintenance,
  monitors,
  linkedIds = [],
}: {
  action: (formData: FormData) => Promise<void>;
  maintenance?: Maintenance;
  monitors: Monitor[];
  linkedIds?: string[];
}) {
  const start = maintenance?.scheduledStart ?? new Date();
  const end = maintenance?.scheduledEnd ?? new Date(Date.now() + 3600_000);
  const linked = new Set(linkedIds);

  return (
    <form action={action}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input name="title" required defaultValue={maintenance?.title ?? ""} placeholder="Database upgrade" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input name="scheduledStart" type="datetime-local" defaultValue={dtLocal(start)} />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input name="scheduledEnd" type="datetime-local" defaultValue={dtLocal(end)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Details</Label>
            <Textarea name="body" rows={3} defaultValue={maintenance?.body ?? ""} placeholder="We will be performing scheduled maintenance…" />
          </div>
          {monitors.length > 0 && (
            <div className="space-y-1.5">
              <Label>Affected monitors</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {monitors.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <input type="checkbox" name="monitors" value={m.id} defaultChecked={linked.has(m.id)} className="size-4 accent-[var(--primary)]" />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublic" defaultChecked={maintenance?.isPublic ?? true} className="size-4 accent-[var(--primary)]" />
            Show on public status page
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifySubscribers" defaultChecked={maintenance?.notifySubscribers} className="size-4 accent-[var(--primary)]" />
            Notify subscribers when it starts
          </label>
          <Button type="submit">{maintenance ? "Save maintenance" : "Schedule maintenance"}</Button>
        </CardContent>
      </Card>
    </form>
  );
}
