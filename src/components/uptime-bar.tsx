import { cn } from "@/lib/utils";

export interface UptimeSlot {
  /** 1 = up, 0 = down, -1 = no data */
  v: number;
  label?: string;
}

/**
 * Uptime history bar (adapted from a 21st.dev Magic "System Status Block").
 * Uses semantic theme tokens so it adapts to every theme.
 */
export function UptimeBar({
  history,
  className,
  barClassName,
}: {
  history: UptimeSlot[];
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("flex items-end gap-[3px]", className)}>
      {history.map((s, i) => (
        <div
          key={i}
          title={s.label}
          className={cn(
            "h-7 flex-1 min-w-[3px] rounded-sm transition-colors",
            s.v === 1 && "bg-success/80 hover:bg-success",
            s.v === 0 && "bg-danger hover:bg-danger",
            s.v === -1 && "bg-muted",
            barClassName
          )}
        />
      ))}
    </div>
  );
}
