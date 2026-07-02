"use client";

import { useActionState, useState } from "react";
import type { Settings } from "@prisma/client";
import { saveApiSettings } from "@/app/admin/api/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/copy-field";
import { Check } from "lucide-react";

function Toggle({ name, defaultChecked, label, hint }: { name: string; defaultChecked: boolean; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 accent-[var(--primary)]" />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function ApiSettingsForm({ settings, endpoint }: { settings: Settings; endpoint: string }) {
  const [state, action, pending] = useActionState(saveApiSettings, null);
  const [enabled, setEnabled] = useState(settings.publicApiEnabled);
  const curl = settings.apiKey ? `curl "${endpoint}?key=YOUR_KEY"` : `curl "${endpoint}"`;

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public read API</CardTitle>
          <CardDescription>A JSON endpoint for external dashboards & integrations. You choose exactly what it exposes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="publicApiEnabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Enable public API
          </label>

          <div>
            <Label className="mb-1.5 block">Endpoint</Label>
            <CopyField value={endpoint} />
          </div>
          <div>
            <Label className="mb-1.5 block">Example</Label>
            <CopyField value={curl} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apiKey">API key (optional)</Label>
            <Input id="apiKey" name="apiKey" defaultValue={settings.apiKey ?? ""} placeholder="Leave empty for open access" />
            <p className="text-xs text-muted-foreground">If set, callers must pass <code>?key=</code> or <code>Authorization: Bearer …</code>.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exposed data</CardTitle>
          <CardDescription>Pick which sections the API returns.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Toggle name="apiMonitors" defaultChecked={settings.apiMonitors} label="Monitors / components" hint="Names, groups, current status" />
          <Toggle name="apiUptime" defaultChecked={settings.apiUptime} label="Uptime %" hint="90-day uptime per monitor" />
          <Toggle name="apiIncidents" defaultChecked={settings.apiIncidents} label="Incidents" hint="Active + recent with updates" />
          <Toggle name="apiMaintenance" defaultChecked={settings.apiMaintenance} label="Maintenance" hint="Upcoming / in-progress windows" />
          <Toggle name="apiMetrics" defaultChecked={settings.apiMetrics} label="Server metrics" hint="Node CPU/mem/disk/IO (may be sensitive)" />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save API settings"}</Button>
        {state?.ok && <span className="flex items-center gap-1 text-sm text-success"><Check className="size-4" /> Saved</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
