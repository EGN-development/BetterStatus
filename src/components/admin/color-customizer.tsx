"use client";

import { useState } from "react";
import type { Settings } from "@prisma/client";
import { COLOR_TOKENS } from "@/lib/custom-colors";
import type { CSSProperties } from "react";
import { CheckCircle2 } from "lucide-react";

type ColorState = Record<string, string>;

export function ColorCustomizer({ settings }: { settings: Settings }) {
  const [enabled, setEnabled] = useState(settings.useCustomColors);
  const [colors, setColors] = useState<ColorState>(() => {
    const init: ColorState = {};
    for (const tk of COLOR_TOKENS) {
      init[tk.key] = (settings[tk.key] as string | null) || tk.fallback;
    }
    return init;
  });

  const set = (k: string, v: string) => setColors((c) => ({ ...c, [k]: v }));

  const previewStyle: CSSProperties = {
    "--background": colors.colBg,
    "--card": colors.colCard,
    "--card-foreground": colors.colForeground,
    "--border": colors.colBorder,
    "--primary": colors.colPrimary,
    "--foreground": colors.colForeground,
    "--muted": colors.colMuted,
    "--muted-foreground": colors.colMutedFg,
    "--success": colors.colSuccess,
    "--warning": colors.colWarning,
    "--danger": colors.colDanger,
  } as CSSProperties;

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="useCustomColors" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 accent-[var(--primary)]" />
        Use custom colors on the public page
      </label>

      <div className={`grid gap-6 lg:grid-cols-2 ${enabled ? "" : "pointer-events-none opacity-50"}`}>
        {/* pickers */}
        <div className="grid grid-cols-2 gap-3">
          {COLOR_TOKENS.map((tk) => (
            <div key={tk.key} className="space-y-1">
              <span className="text-xs text-muted-foreground">{tk.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name={tk.key}
                  value={colors[tk.key]}
                  onChange={(e) => set(tk.key, e.target.value)}
                  className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
                />
                <input
                  value={colors[tk.key]}
                  onChange={(e) => set(tk.key, e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-input px-2 font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        {/* live preview */}
        <div>
          <span className="mb-2 block text-xs text-muted-foreground">Live preview</span>
          <div className="rounded-xl border border-border p-4" style={{ ...previewStyle, background: "var(--background)", color: "var(--foreground)" }}>
            {/* banner */}
            <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--success) 12%, transparent)" }}>
              <CheckCircle2 className="size-6" style={{ color: "var(--success)" }} />
              <div className="text-sm font-semibold">All systems operational</div>
            </div>
            {/* service card */}
            <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--card-foreground)" }}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">API</span>
                <span style={{ color: "var(--muted-foreground)" }}>99.9%</span>
              </div>
              <div className="grid grid-cols-12 gap-[2px]">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-6 rounded-[2px]" style={{ background: i === 4 ? "var(--warning)" : i === 8 ? "var(--danger)" : "var(--success)" }} />
                ))}
              </div>
            </div>
            <div className="mt-3 text-xs" style={{ color: "var(--muted-foreground)" }}>Muted helper text · 90 days ago … Today</div>
          </div>
        </div>
      </div>
    </div>
  );
}
