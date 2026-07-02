export interface ThemeDef {
  key: string;
  label: string;
  dark: boolean;
  swatch: string; // primary color for preview
}

export const THEMES: ThemeDef[] = [
  { key: "midnight", label: "Midnight", dark: true, swatch: "#6366f1" },
  { key: "aurora", label: "Aurora", dark: true, swatch: "#2dd4bf" },
  { key: "nocturne", label: "Nocturne", dark: true, swatch: "#a855f7" },
  { key: "daylight", label: "Daylight", dark: false, swatch: "#2563eb" },
  { key: "paper", label: "Paper", dark: false, swatch: "#1c1b19" },
];

export const DEFAULT_THEME = "midnight";

export function isValidTheme(key: string | null | undefined): boolean {
  return !!key && THEMES.some((t) => t.key === key);
}
