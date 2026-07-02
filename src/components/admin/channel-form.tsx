"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ChannelType, NotificationChannel } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TYPES: { value: ChannelType; label: string }[] = [
  { value: "TELEGRAM", label: "Telegram" },
  { value: "EMAIL", label: "Email" },
  { value: "SLACK", label: "Slack" },
  { value: "DISCORD", label: "Discord" },
  { value: "WEBHOOK", label: "Webhook" },
  { value: "API", label: "API (custom JSON)" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ChannelForm({
  action,
  channel,
}: {
  action: (formData: FormData) => Promise<void>;
  channel?: NotificationChannel;
}) {
  const router = useRouter();
  const [type, setType] = useState<ChannelType>(channel?.type ?? "TELEGRAM");
  const cfg = (channel?.config ?? {}) as Record<string, unknown>;
  const headersStr = cfg.headers ? JSON.stringify(cfg.headers, null, 2) : "";

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Channel</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required defaultValue={channel?.name ?? ""} placeholder="Ops Telegram" />
            </Field>
            <Field label="Type">
              <Select name="type" value={type} onChange={(e) => setType(e.target.value as ChannelType)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>
          </div>

          {type === "TELEGRAM" && (
            <>
              <Field label="Bot token" hint="From @BotFather">
                <Input name="botToken" defaultValue={(cfg.botToken as string) ?? ""} placeholder="123456:ABC..." />
              </Field>
              <Field label="Chat ID" hint="User, group or channel id">
                <Input name="chatId" defaultValue={(cfg.chatId as string) ?? ""} placeholder="-1001234567890" />
              </Field>
            </>
          )}
          {type === "EMAIL" && (
            <Field label="Send to" hint="Uses the SMTP config from Settings">
              <Input name="to" type="email" defaultValue={(cfg.to as string) ?? ""} placeholder="ops@example.com" />
            </Field>
          )}
          {(type === "SLACK" || type === "DISCORD") && (
            <>
              <Field label="Webhook URL" hint={type === "DISCORD" ? "Discord → Channel → Integrations → Webhooks → Copy URL" : "Slack incoming webhook URL"}>
                <Input name="webhookUrl" defaultValue={(cfg.webhookUrl as string) ?? ""} placeholder="https://..." />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bot name (optional)">
                  <Input name="username" defaultValue={(cfg.username as string) ?? ""} placeholder="Status Bot" />
                </Field>
                <Field label="Avatar URL (optional)">
                  <Input name="avatarUrl" defaultValue={(cfg.avatarUrl as string) ?? ""} placeholder="https://…/icon.png" />
                </Field>
              </div>
            </>
          )}
          {(type === "WEBHOOK" || type === "API") && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="URL"><Input name="url" defaultValue={(cfg.url as string) ?? ""} className="sm:col-span-2" placeholder="https://..." /></Field>
                <Field label="Method">
                  <Select name="method" defaultValue={(cfg.method as string) ?? "POST"}>
                    {["POST", "PUT", "GET"].map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Headers (JSON, optional)">
                <Textarea name="headers" rows={3} defaultValue={headersStr} className="font-mono text-xs" placeholder='{"Authorization":"Bearer ..."}' />
              </Field>
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={channel?.enabled ?? true} className="size-4 accent-[var(--primary)]" />
            Enabled
          </label>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit">{channel ? "Save channel" : "Create channel"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
