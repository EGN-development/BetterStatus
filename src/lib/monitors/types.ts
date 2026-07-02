import type { Monitor } from "@prisma/client";

export interface CheckResult {
  up: boolean;
  responseTimeMs?: number;
  statusCode?: number;
  message: string;
}

export type CheckFn = (monitor: Monitor) => Promise<CheckResult>;

/** Parse an expected-status spec like "200", "200-299", "200,301,302". */
export function statusMatches(spec: string | null | undefined, code: number): boolean {
  if (!spec) return code >= 200 && code < 300;
  return spec
    .split(",")
    .map((s) => s.trim())
    .some((part) => {
      if (part.includes("-")) {
        const [lo, hi] = part.split("-").map((n) => parseInt(n, 10));
        return code >= lo && code <= hi;
      }
      return parseInt(part, 10) === code;
    });
}
