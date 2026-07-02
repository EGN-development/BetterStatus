"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Monitor, MonitorType, NotificationChannel } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { monitorTypeMeta } from "@/lib/status";

const TYPES: MonitorType[] = ["HTTP", "API", "PING", "TCP", "UDP", "DNS", "CRON"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}

export function MonitorForm({
  action,
  monitor,
  channels,
}: {
  action: (formData: FormData) => Promise<void>;
  monitor?: Monitor & { channels?: { id: string }[] };
  channels: NotificationChannel[];
}) {
  const router = useRouter();
  const [type, setType] = useState<MonitorType>(monitor?.type ?? "HTTP");
  const linkedChannels = new Set((monitor?.channels ?? []).map((c) => c.id));
  const isHttp = type === "HTTP" || type === "API";
  const headersStr = monitor?.requestHeaders ? JSON.stringify(monitor.requestHeaders, null, 2) : "";

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required defaultValue={monitor?.name ?? ""} placeholder="My API" />
            </Field>
            <Field label="Type">
              <Select name="type" value={type} onChange={(e) => setType(e.target.value as MonitorType)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {monitorTypeMeta[t].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">{monitorTypeMeta[type].hint}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Check interval (s)" hint={type === "CRON" ? "Expected heartbeat period" : undefined}>
              <Input name="intervalSeconds" type="number" min={10} defaultValue={monitor?.intervalSeconds ?? 60} />
            </Field>
            {type !== "CRON" ? (
              <>
                <Field label="Timeout (s)">
                  <Input name="timeoutSeconds" type="number" min={1} defaultValue={monitor?.timeoutSeconds ?? 30} />
                </Field>
                <Field label="Retries before down">
                  <Input name="retries" type="number" min={1} defaultValue={monitor?.retries ?? 1} />
                </Field>
              </>
            ) : (
              <Field label="Grace period (s)" hint="Extra time before marking down">
                <Input name="graceSeconds" type="number" min={0} defaultValue={monitor?.graceSeconds ?? 60} />
              </Field>
            )}
          </div>
          <Field label="Group (optional)" hint="Group monitors on the public page">
            <Input name="group" defaultValue={monitor?.group ?? ""} placeholder="e.g. API, Frontend" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target</CardTitle>
          <CardDescription>What to check for a {monitorTypeMeta[type].label} monitor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isHttp && (
            <>
              <Field label="URL">
                <Input name="url" type="url" required defaultValue={monitor?.url ?? ""} placeholder="https://example.com/health" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Method">
                  <Select name="method" defaultValue={monitor?.method ?? "GET"}>
                    {["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Expected status" hint='e.g. "200", "200-299", "200,301"'>
                  <Input name="expectedStatus" defaultValue={monitor?.expectedStatus ?? "200-299"} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Keyword (optional)" hint="Body must contain this">
                  <Input name="keyword" defaultValue={monitor?.keyword ?? ""} />
                </Field>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <Check name="keywordInverted" label="Keyword must be ABSENT" defaultChecked={monitor?.keywordInverted} />
                  <Check name="followRedirects" label="Follow redirects" defaultChecked={monitor?.followRedirects ?? true} />
                  <Check name="ignoreTls" label="Ignore TLS errors" defaultChecked={monitor?.ignoreTls} />
                </div>
              </div>
              <Field label="Request headers (JSON, optional)">
                <Textarea name="requestHeaders" rows={3} defaultValue={headersStr} placeholder='{"Authorization":"Bearer ..."}' className="font-mono text-xs" />
              </Field>
              <Field label="Request body (optional)">
                <Textarea name="requestBody" rows={2} defaultValue={monitor?.requestBody ?? ""} />
              </Field>
            </>
          )}

          {type === "PING" && (
            <Field label="Host / IP">
              <Input name="host" required defaultValue={monitor?.host ?? ""} placeholder="example.com or 1.1.1.1" />
            </Field>
          )}

          {(type === "TCP" || type === "UDP") && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Host / IP">
                  <Input name="host" required defaultValue={monitor?.host ?? ""} placeholder="example.com" />
                </Field>
                <Field label="Port">
                  <Input name="port" type="number" required defaultValue={monitor?.port ?? (type === "TCP" ? 80 : 53)} />
                </Field>
              </div>
              {type === "UDP" && (
                <>
                  <Field label="Payload to send (optional)">
                    <Input name="requestBody" defaultValue={monitor?.requestBody ?? ""} placeholder="ping" />
                  </Field>
                  <Field label="Expected reply keyword (optional)" hint="If set, a matching reply is required">
                    <Input name="keyword" defaultValue={monitor?.keyword ?? ""} />
                  </Field>
                </>
              )}
            </>
          )}

          {type === "DNS" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hostname">
                  <Input name="host" required defaultValue={monitor?.host ?? ""} placeholder="example.com" />
                </Field>
                <Field label="Record type">
                  <Select name="dnsRecordType" defaultValue={monitor?.dnsRecordType ?? "A"}>
                    {["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Resolver (optional)" hint="e.g. 1.1.1.1">
                  <Input name="dnsResolver" defaultValue={monitor?.dnsResolver ?? ""} />
                </Field>
                <Field label="Expected value contains (optional)">
                  <Input name="dnsExpected" defaultValue={monitor?.dnsExpected ?? ""} />
                </Field>
              </div>
            </>
          )}

          {type === "CRON" && (
            <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
              A unique heartbeat URL will be generated after you save. Have your job{" "}
              <code className="text-foreground">curl</code> that URL on each run; if no ping arrives within the
              interval + grace period, the monitor goes down.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Alert webhook URL (optional)" hint="Quick per-monitor webhook called on status change">
            <Input name="alertWebhookUrl" type="url" defaultValue={monitor?.alertWebhookUrl ?? ""} placeholder="https://hooks.example.com/..." />
          </Field>
          {channels.length > 0 && (
            <Field label="Notification channels">
              <div className="grid gap-2 sm:grid-cols-2">
                {channels.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <input type="checkbox" name="channels" value={c.id} defaultChecked={linkedChannels.has(c.id)} className="size-4 accent-[var(--primary)]" />
                    {c.name} <span className="text-xs text-muted-foreground">({c.type})</span>
                  </label>
                ))}
              </div>
            </Field>
          )}
          <Check name="notifySubscribers" label="Notify public status page subscribers" defaultChecked={monitor?.notifySubscribers} />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit">{monitor ? "Save changes" : "Create monitor"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
