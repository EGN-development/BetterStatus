import { CheckCircle2, AlertTriangle, XCircle, Wrench, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "muted";

const styles: Record<Tone, { wrap: string; iconWrap: string; icon: typeof CheckCircle2 }> = {
  default: { wrap: "from-primary/10", iconWrap: "bg-primary/15 text-primary", icon: CheckCircle2 },
  success: { wrap: "from-success/10", iconWrap: "bg-success/15 text-success", icon: CheckCircle2 },
  warning: { wrap: "from-warning/10", iconWrap: "bg-warning/15 text-warning", icon: AlertTriangle },
  danger: { wrap: "from-danger/10", iconWrap: "bg-danger/15 text-danger", icon: XCircle },
  info: { wrap: "from-info/10", iconWrap: "bg-info/15 text-info", icon: Wrench },
  muted: { wrap: "from-muted", iconWrap: "bg-muted text-muted-foreground", icon: CircleDashed },
};

export function StatusBanner({
  tone,
  label,
  updatedAt,
  uptime,
  days,
}: {
  tone: Tone;
  label: string;
  updatedAt: string;
  uptime?: number | null;
  days?: number;
}) {
  const s = styles[tone];
  const Icon = s.icon;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-r to-transparent p-5 sm:p-6",
        s.wrap
      )}
    >
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", s.iconWrap)}>
        <Icon className="size-7" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-semibold tracking-tight sm:text-xl">{label}</div>
        <div className="text-sm text-muted-foreground">Updated {updatedAt}</div>
      </div>
      {uptime != null && (
        <div className="hidden shrink-0 text-right sm:block">
          <div className="text-2xl font-semibold tabular-nums">{uptime}%</div>
          <div className="text-xs text-muted-foreground">uptime · {days}d</div>
        </div>
      )}
    </div>
  );
}
