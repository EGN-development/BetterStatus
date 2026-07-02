import type {
  MonitorStatus,
  IncidentStatus,
  IncidentImpact,
} from "@prisma/client";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "muted";

export const monitorStatusMeta: Record<
  MonitorStatus,
  { label: string; tone: Tone }
> = {
  UP: { label: "Operational", tone: "success" },
  DOWN: { label: "Down", tone: "danger" },
  PENDING: { label: "Pending", tone: "muted" },
  PAUSED: { label: "Paused", tone: "muted" },
  MAINTENANCE: { label: "Maintenance", tone: "info" },
};

export const incidentStatusMeta: Record<
  IncidentStatus,
  { label: string; tone: Tone }
> = {
  INVESTIGATING: { label: "Investigating", tone: "danger" },
  IDENTIFIED: { label: "Identified", tone: "warning" },
  MONITORING: { label: "Monitoring", tone: "info" },
  RESOLVED: { label: "Resolved", tone: "success" },
};

export const incidentImpactMeta: Record<
  IncidentImpact,
  { label: string; tone: Tone }
> = {
  NONE: { label: "None", tone: "muted" },
  MINOR: { label: "Minor", tone: "warning" },
  MAJOR: { label: "Major", tone: "danger" },
  CRITICAL: { label: "Critical", tone: "danger" },
  MAINTENANCE: { label: "Maintenance", tone: "info" },
};

export const monitorTypeMeta: Record<string, { label: string; hint: string }> = {
  HTTP: { label: "HTTP(s)", hint: "Website / endpoint up + status code + keyword" },
  API: { label: "API", hint: "JSON API ping with keyword / status assertion" },
  PING: { label: "Ping (ICMP)", hint: "Host reachability via ICMP echo" },
  TCP: { label: "TCP Port", hint: "TCP connection to host:port" },
  UDP: { label: "UDP Port", hint: "UDP datagram to host:port" },
  DNS: { label: "DNS", hint: "Resolve a DNS record" },
  CRON: { label: "Cron / Heartbeat", hint: "Dead-man switch — expects a periodic ping" },
};

/** Overall page status derived from a set of monitor statuses. */
export function overallStatus(statuses: MonitorStatus[]): {
  label: string;
  tone: Tone;
} {
  if (statuses.length === 0)
    return { label: "No monitors yet", tone: "muted" };
  if (statuses.some((s) => s === "DOWN"))
    return { label: "Major outage", tone: "danger" };
  if (statuses.some((s) => s === "MAINTENANCE"))
    return { label: "Under maintenance", tone: "info" };
  if (statuses.every((s) => s === "UP" || s === "PAUSED"))
    return { label: "All systems operational", tone: "success" };
  return { label: "Partial degradation", tone: "warning" };
}
