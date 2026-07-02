"use client";

import { useState } from "react";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function ThemePicker({ value }: { value: string }) {
  const [selected, setSelected] = useState(value);

  // live-preview the theme on the whole document while choosing
  function pick(key: string) {
    setSelected(key);
    document.documentElement.setAttribute("data-theme", key);
  }

  return (
    <div>
      <input type="hidden" name="theme" value={selected} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {THEMES.map((t) => (
          <button
            type="button"
            key={t.key}
            onClick={() => pick(t.key)}
            className={cn(
              "group relative flex flex-col gap-2 rounded-[var(--radius)] border p-3 text-left transition-all",
              selected === t.key
                ? "border-primary ring-2 ring-primary"
                : "border-border hover:border-muted-foreground"
            )}
          >
            <div
              className="flex h-12 items-center justify-between rounded-md px-2"
              style={{ background: t.dark ? "#11131a" : "#f3f4f6" }}
            >
              <span
                className="size-5 rounded-full"
                style={{ background: t.swatch }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: t.dark ? "#e6eaf2" : "#1c1b19" }}
              >
                {t.dark ? "Dark" : "Light"}
              </span>
            </div>
            <span className="flex items-center justify-between text-sm font-medium">
              {t.label}
              {selected === t.key && <Check className="size-4 text-primary" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
