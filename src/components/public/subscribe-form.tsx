"use client";

import { useActionState, useState, useTransition } from "react";
import { subscribe, createTelegramBindLink } from "@/lib/subscribe";
import type { Lang } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Send } from "lucide-react";

type Channel = "EMAIL" | "TELEGRAM" | "DISCORD" | "SLACK" | "WEBHOOK";

const placeholders: Record<Channel, string> = {
  EMAIL: "you@example.com",
  TELEGRAM: "",
  DISCORD: "https://discord.com/api/webhooks/…",
  SLACK: "https://hooks.slack.com/services/…",
  WEBHOOK: "https://your-endpoint.example.com/hook",
};

export function SubscribeForm({ lang, telegramEnabled }: { lang: Lang; telegramEnabled: boolean }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const [state, action, pending] = useActionState(subscribe, null);
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [tgPending, startTg] = useTransition();
  const [tgError, setTgError] = useState<string | null>(null);

  function openTelegram() {
    setTgError(null);
    startTg(async () => {
      const r = await createTelegramBindLink();
      if (r.url) window.open(r.url, "_blank");
      else setTgError(r.error ?? "error");
    });
  }

  const channels: { value: Channel; label: string }[] = [
    { value: "EMAIL", label: "Email" },
    ...(telegramEnabled ? [{ value: "TELEGRAM" as Channel, label: "Telegram" }] : []),
    { value: "DISCORD", label: "Discord webhook" },
    { value: "SLACK", label: "Slack webhook" },
    { value: "WEBHOOK", label: "Webhook" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className="sm:w-44">
          {channels.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>

        {channel === "TELEGRAM" ? (
          <Button type="button" variant="outline" className="flex-1" onClick={openTelegram} disabled={tgPending}>
            <Send className="size-4" /> {tgPending ? "…" : "Open Telegram bot"}
          </Button>
        ) : (
          <form action={action} className="flex flex-1 flex-col gap-2 sm:flex-row">
            <input type="hidden" name="channel" value={channel} />
            <Input
              name="target"
              type={channel === "EMAIL" ? "email" : "url"}
              required
              placeholder={placeholders[channel]}
              className="flex-1"
            />
            <Button type="submit" disabled={pending}>
              <Bell className="size-4" /> {pending ? "…" : t("subscribe")}
            </Button>
          </form>
        )}
      </div>

      {channel !== "EMAIL" && channel !== "TELEGRAM" && (
        <p className="text-xs text-muted-foreground">
          You&apos;ll get a confirmation now, and status + maintenance updates going forward. Unsubscribe link is included in every message.
        </p>
      )}
      {state?.message && <p className="text-sm text-success">{state.message}</p>}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {tgError && <p className="text-sm text-danger">{tgError}</p>}
    </div>
  );
}
