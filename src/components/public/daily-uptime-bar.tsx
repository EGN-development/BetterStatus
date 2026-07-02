import { cn } from "@/lib/utils";
import type { DayUptime, DayStatus } from "@/lib/monitors/stats";

const color: Record<DayStatus, string> = {
  up: "bg-success",
  partial: "bg-warning",
  down: "bg-danger",
  none: "bg-muted",
};

/**
 * One bar per day (Statuspage / Better Stack style) with a hover tooltip
 * showing the date and that day's uptime. Pure CSS hover — no JS needed.
 */
export function DailyUptimeBar({ days }: { days: DayUptime[] }) {
  return (
    <div className="flex h-9 items-stretch gap-[2px]">
      {days.map((d, i) => (
        <div key={i} className="group relative flex-1">
          <div
            className={cn(
              "h-full w-full rounded-[2px] transition-all duration-150 group-hover:opacity-80",
              color[d.status]
            )}
          />
          <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-card px-3 py-2 text-center shadow-xl group-hover:block">
            <div className="text-xs font-semibold text-foreground">{d.label}</div>
            <div
              className={cn(
                "text-xs",
                d.status === "up" && "text-success",
                d.status === "partial" && "text-warning",
                d.status === "down" && "text-danger",
                d.status === "none" && "text-muted-foreground"
              )}
            >
              {d.status === "none" ? "No data" : `${d.pct}% uptime`}
            </div>
            <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card" />
          </div>
        </div>
      ))}
    </div>
  );
}
