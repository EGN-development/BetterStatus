import { cn } from "@/lib/utils";

export function Gauge({
  label,
  pct,
  sub,
}: {
  label: string;
  pct: number | null;
  sub?: string;
}) {
  const v = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const tone = pct == null ? "bg-muted-foreground" : v >= 90 ? "bg-danger" : v >= 70 ? "bg-warning" : "bg-success";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{pct == null ? "—" : `${v.toFixed(0)}%`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${v}%` }} />
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
