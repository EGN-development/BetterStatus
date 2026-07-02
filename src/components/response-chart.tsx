/** Minimal dependency-free SVG area chart for response times. */
export function ResponseChart({
  points,
  height = 120,
}: {
  points: { t: number; ms: number | null }[];
  height?: number;
}) {
  const vals = points.filter((p) => p.ms != null).map((p) => p.ms!) as number[];
  if (vals.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        Not enough data yet
      </div>
    );
  }
  const max = Math.max(...vals, 1);
  const w = 600;
  const pad = 6;
  const step = (w - pad * 2) / (points.length - 1);
  const y = (ms: number | null) =>
    ms == null ? height - pad : height - pad - (ms / max) * (height - pad * 2);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${pad + i * step},${y(p.ms)}`)
    .join(" ");
  const area = `${line} L ${pad + (points.length - 1) * step},${height - pad} L ${pad},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="rc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rc-fill)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
