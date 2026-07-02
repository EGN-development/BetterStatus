"use client";

import { useActionState } from "react";
import type { Settings } from "@prisma/client";
import { saveSettings } from "@/app/admin/settings/actions";
import { ThemePicker } from "./theme-picker";
import { ColorCustomizer } from "./color-customizer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState(saveSettings, null);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>How your public status page is presented.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="siteName">Site name</Label>
              <Input id="siteName" name="siteName" defaultValue={settings.siteName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publicUrl">Public URL</Label>
              <Input id="publicUrl" name="publicUrl" placeholder="https://status.example.com" defaultValue={settings.publicUrl ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="siteDescription">Tagline</Label>
            <Input id="siteDescription" name="siteDescription" defaultValue={settings.siteDescription} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Logo (icon next to name)</Label>
              <div className="flex items-center gap-3">
                {settings.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.logoUrl} alt="logo" className="size-10 rounded-lg border border-border object-cover" />
                )}
                <input type="file" name="logoFile" accept="image/*" className="text-sm" />
              </div>
              {settings.logoUrl && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="removeLogo" className="size-3.5 accent-[var(--primary)]" /> Remove logo
                </label>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Favicon</Label>
              <div className="flex items-center gap-3">
                {settings.faviconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.faviconUrl} alt="favicon" className="size-10 rounded-lg border border-border object-cover" />
                )}
                <input type="file" name="faviconFile" accept="image/*,.ico" className="text-sm" />
              </div>
              {settings.faviconUrl && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" name="removeFavicon" className="size-3.5 accent-[var(--primary)]" /> Remove favicon
                </label>
              )}
            </div>
          </div>

          <Toggle name="allowSubscribers" defaultChecked={settings.allowSubscribers} label="Allow subscribers" hint="Let visitors subscribe to incident updates." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Pick the look of your status page & admin. Preview applies instantly; Save to persist.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker value={settings.theme} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public colors</CardTitle>
          <CardDescription>Override the theme with your own colors for blocks, outlines, status & accents. Preview updates live.</CardDescription>
        </CardHeader>
        <CardContent>
          <ColorCustomizer settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Telegram bot</CardTitle>
          <CardDescription>Set a bot token (from @BotFather) to enable Telegram subscriptions & notifications. The username is detected automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="telegramBotToken">Bot token</Label>
            <Input id="telegramBotToken" name="telegramBotToken" type="password" defaultValue={settings.telegramBotToken ?? ""} placeholder="123456:ABC-DEF…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telegramBotUsername">Bot username (optional)</Label>
            <Input id="telegramBotUsername" name="telegramBotUsername" defaultValue={settings.telegramBotUsername ?? ""} placeholder="my_status_bot" />
          </div>
          {settings.telegramBotUsername && (
            <p className="text-xs text-success">Bot @{settings.telegramBotUsername} is configured — Telegram subscriptions are enabled.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metrics display (global)</CardTitle>
          <CardDescription>Master switches: turning a field off hides it on the cluster averages AND on every node. To hide a field on just one server, use that server&apos;s &quot;Public display&quot; card instead.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Toggle name="showClusterAverages" defaultChecked={settings.showClusterAverages} label="Cluster averages section" hint="Per-pool average metric cards" />
          <Toggle name="showNodeMetrics" defaultChecked={settings.showNodeMetrics} label="Node metrics section" hint="Individual server breakdown" />
          <Toggle name="showCpuUsage" defaultChecked={settings.showCpuUsage} label="CPU usage" hint="Averages + all nodes" />
          <Toggle name="showMemoryUsage" defaultChecked={settings.showMemoryUsage} label="Memory usage" hint="Averages + all nodes" />
          <Toggle name="showDiskUsage" defaultChecked={settings.showDiskUsage} label="Disk usage" hint="Averages + all nodes" />
          <Toggle name="showLoad" defaultChecked={settings.showLoad} label="Load" hint="Averages + all nodes" />
          <Toggle name="showDiskIo" defaultChecked={settings.showDiskIo} label="Disk I/O" hint="Averages + all nodes" />
          <Toggle name="showNetIo" defaultChecked={settings.showNetIo} label="Network I/O" hint="Averages + all nodes" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email (SMTP)</CardTitle>
          <CardDescription>Used for email alerts and subscriber notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="smtpHost">Host</Label>
              <Input id="smtpHost" name="smtpHost" placeholder="smtp.example.com" defaultValue={settings.smtpHost ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtpPort">Port</Label>
              <Input id="smtpPort" name="smtpPort" type="number" defaultValue={settings.smtpPort ?? 587} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="smtpUser">Username</Label>
              <Input id="smtpUser" name="smtpUser" defaultValue={settings.smtpUser ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtpPass">Password</Label>
              <Input id="smtpPass" name="smtpPass" type="password" defaultValue={settings.smtpPass ?? ""} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtpFrom">From address</Label>
            <Input id="smtpFrom" name="smtpFrom" placeholder="status@example.com" defaultValue={settings.smtpFrom ?? ""} />
          </div>
          <Toggle name="smtpSecure" defaultChecked={settings.smtpSecure} label="Use TLS/SSL (port 465)" />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state?.ok && <span className="text-sm text-success">Saved ✓</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
