import type { Agent, Pool } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AgentForm({
  action,
  agent,
  pools = [],
}: {
  action: (formData: FormData) => Promise<void>;
  agent?: Agent;
  pools?: Pool[];
}) {
  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Server</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input name="name" required defaultValue={agent?.name ?? ""} placeholder="web-01" />
            </div>
            <div className="space-y-1.5">
              <Label>Pool / cluster</Label>
              <Select name="poolId" defaultValue={agent?.poolId ?? ""}>
                <option value="">— no pool —</option>
                {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>CPU alert %</Label>
              <Input name="cpuThreshold" type="number" min={1} max={100} defaultValue={agent?.cpuThreshold ?? ""} placeholder="90" />
            </div>
            <div className="space-y-1.5">
              <Label>Memory alert %</Label>
              <Input name="memThreshold" type="number" min={1} max={100} defaultValue={agent?.memThreshold ?? ""} placeholder="90" />
            </div>
            <div className="space-y-1.5">
              <Label>Disk alert %</Label>
              <Input name="diskThreshold" type="number" min={1} max={100} defaultValue={agent?.diskThreshold ?? ""} placeholder="90" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mark offline after (seconds)</Label>
            <Input name="offlineSeconds" type="number" min={30} defaultValue={agent?.offlineSeconds ?? 120} />
          </div>
          <div className="space-y-1.5">
            <Label>Alert webhook URL (optional)</Label>
            <Input name="alertWebhookUrl" type="url" defaultValue={agent?.alertWebhookUrl ?? ""} placeholder="https://hooks..." />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifySubscribers" defaultChecked={agent?.notifySubscribers} className="size-4 accent-[var(--primary)]" />
            Notify subscribers on threshold/offline alerts
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="public" defaultChecked={agent?.public ?? true} className="size-4 accent-[var(--primary)]" />
            Show this server on the public status page
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public display</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {DISPLAY_FIELDS.map((f) => (
            <label key={f.name} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={f.name}
                defaultChecked={(agent ? (agent as Record<string, unknown>)[f.name] : true) as boolean}
                className="size-4 accent-[var(--primary)]"
              />
              {f.label}
            </label>
          ))}
        </CardContent>
      </Card>

      <Button type="submit">{agent ? "Save server" : "Create server"}</Button>
    </form>
  );
}

const DISPLAY_FIELDS = [
  { name: "showCpuModel", label: "CPU model" },
  { name: "showCpuThreads", label: "CPU threads" },
  { name: "showTotalMemory", label: "Total memory" },
  { name: "showCpuUsage", label: "CPU usage" },
  { name: "showMemoryUsage", label: "Memory usage" },
  { name: "showDiskUsage", label: "Disk usage" },
  { name: "showLoad", label: "Load average" },
  { name: "showDiskIo", label: "Disk I/O" },
  { name: "showNetIo", label: "Network I/O" },
  { name: "showUptime", label: "Uptime" },
] as const;
