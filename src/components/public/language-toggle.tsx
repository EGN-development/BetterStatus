"use client";

import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  function set(l: Lang) {
    document.cookie = `bs_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <div className="flex items-center rounded-full border border-border p-0.5 text-xs">
      {(["en", "ru"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => set(l)}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium uppercase transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
