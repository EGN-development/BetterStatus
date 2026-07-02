"use client";

import { useActionState, useState, useTransition } from "react";
import { subscribe, createTelegramBindLink } from "@/lib/subscribe";
import type { Lang } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Send } from "lucide-react";

export function SubscribeForm({
  lang,
  telegramEnabled,
}: {
  lang: Lang;
  telegramEnabled: boolean;
}) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const [state, action, pending] = useActionState(subscribe, null);
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

  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="channel" value="EMAIL" />
        <Input name="target" type="email" required placeholder="you@example.com" className="flex-1" />
        <Button type="submit" disabled={pending}>
          <Bell className="size-4" /> {pending ? "…" : t("subscribe")}
        </Button>
      </form>

      {telegramEnabled && (
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      {telegramEnabled && (
        <Button type="button" variant="outline" className="w-full" onClick={openTelegram} disabled={tgPending}>
          <Send className="size-4" /> {tgPending ? "…" : "Telegram"}
        </Button>
      )}

      {state?.message && <p className="text-sm text-success">{state.message}</p>}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {tgError && <p className="text-sm text-danger">{tgError}</p>}
    </div>
  );
}
