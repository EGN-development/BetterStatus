import type { CSSProperties } from "react";
import type { Settings } from "@prisma/client";

export interface ColorTokenDef {
  key: keyof Pick<
    Settings,
    "colBg" | "colCard" | "colBorder" | "colPrimary" | "colForeground" | "colMuted" | "colMutedFg" | "colSuccess" | "colWarning" | "colDanger"
  >;
  label: string;
  fallback: string;
}

export const COLOR_TOKENS: ColorTokenDef[] = [
  { key: "colBg", label: "Background", fallback: "#0b0f1a" },
  { key: "colCard", label: "Cards / blocks", fallback: "#121828" },
  { key: "colBorder", label: "Outline / borders", fallback: "#232c44" },
  { key: "colPrimary", label: "Primary / accent", fallback: "#6366f1" },
  { key: "colForeground", label: "Text", fallback: "#e6eaf2" },
  { key: "colMuted", label: "Muted background", fallback: "#1b2236" },
  { key: "colMutedFg", label: "Muted text", fallback: "#94a0bd" },
  { key: "colSuccess", label: "Operational (green)", fallback: "#22c55e" },
  { key: "colWarning", label: "Degraded (amber)", fallback: "#f59e0b" },
  { key: "colDanger", label: "Outage (red)", fallback: "#ef4444" },
];

/** Build inline CSS variable overrides from a settings-like object. */
export function customColorStyle(s: {
  useCustomColors: boolean;
  colBg: string | null;
  colCard: string | null;
  colBorder: string | null;
  colPrimary: string | null;
  colForeground: string | null;
  colMuted: string | null;
  colMutedFg: string | null;
  colSuccess: string | null;
  colWarning: string | null;
  colDanger: string | null;
}): CSSProperties {
  if (!s.useCustomColors) return {};
  const m: Record<string, string> = {};
  const set = (k: string, v: string | null) => {
    if (v) m[k] = v;
  };
  set("--background", s.colBg);
  set("--card", s.colCard);
  set("--card-foreground", s.colForeground);
  set("--border", s.colBorder);
  set("--input", s.colCard);
  set("--primary", s.colPrimary);
  set("--foreground", s.colForeground);
  set("--muted", s.colMuted);
  set("--muted-foreground", s.colMutedFg);
  set("--accent", s.colMuted);
  set("--success", s.colSuccess);
  set("--warning", s.colWarning);
  set("--danger", s.colDanger);
  return m as CSSProperties;
}
