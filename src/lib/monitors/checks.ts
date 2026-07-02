import net from "node:net";
import dgram from "node:dgram";
import dns from "node:dns/promises";
import { spawn } from "node:child_process";
import { Agent } from "undici";
import type { Monitor } from "@prisma/client";
import { type CheckResult, statusMatches } from "./types";

const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

// ───────────────────── HTTP / API ─────────────────────
export async function checkHttp(m: Monitor): Promise<CheckResult> {
  if (!m.url) return { up: false, message: "No URL configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), m.timeoutSeconds * 1000);
  const start = performance.now();
  try {
    const headers: Record<string, string> = {};
    if (m.requestHeaders && typeof m.requestHeaders === "object") {
      for (const [k, v] of Object.entries(m.requestHeaders as Record<string, unknown>)) {
        headers[k] = String(v);
      }
    }
    const res = await fetch(m.url, {
      method: m.method || "GET",
      headers,
      body: m.method && !["GET", "HEAD"].includes(m.method) ? m.requestBody ?? undefined : undefined,
      redirect: m.followRedirects ? "follow" : "manual",
      signal: controller.signal,
      // @ts-expect-error undici dispatcher option
      dispatcher: m.ignoreTls ? insecureAgent : undefined,
    });
    const ms = Math.round(performance.now() - start);

    if (!statusMatches(m.expectedStatus, res.status)) {
      return { up: false, statusCode: res.status, responseTimeMs: ms, message: `Unexpected status ${res.status}` };
    }
    if (m.keyword) {
      const body = await res.text();
      const found = body.includes(m.keyword);
      if (m.keywordInverted && found)
        return { up: false, statusCode: res.status, responseTimeMs: ms, message: `Keyword "${m.keyword}" present (should be absent)` };
      if (!m.keywordInverted && !found)
        return { up: false, statusCode: res.status, responseTimeMs: ms, message: `Keyword "${m.keyword}" not found` };
    }
    return { up: true, statusCode: res.status, responseTimeMs: ms, message: `${res.status} OK` };
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    const msg = e instanceof Error ? (e.name === "AbortError" ? "Timeout" : e.message) : "Request failed";
    return { up: false, responseTimeMs: ms, message: msg };
  } finally {
    clearTimeout(timeout);
  }
}

// ───────────────────── TCP ─────────────────────
export function checkTcp(m: Monitor): Promise<CheckResult> {
  return new Promise((resolve) => {
    if (!m.host || !m.port) return resolve({ up: false, message: "No host/port configured" });
    const start = performance.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (r: CheckResult) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(r);
    };
    socket.setTimeout(m.timeoutSeconds * 1000);
    socket.once("connect", () =>
      finish({ up: true, responseTimeMs: Math.round(performance.now() - start), message: `Connected to ${m.host}:${m.port}` })
    );
    socket.once("timeout", () => finish({ up: false, message: "Connection timeout" }));
    socket.once("error", (err) => finish({ up: false, message: err.message }));
    socket.connect(m.port, m.host);
  });
}

// ───────────────────── UDP ─────────────────────
// UDP is connectionless: we send a datagram and treat a reply as "up".
// If no reply but no ICMP error within timeout, we consider it reachable
// (configurable via keyword: if set, a matching reply is required).
export function checkUdp(m: Monitor): Promise<CheckResult> {
  return new Promise((resolve) => {
    if (!m.host || !m.port) return resolve({ up: false, message: "No host/port configured" });
    const start = performance.now();
    const socket = dgram.createSocket("udp4");
    let done = false;
    const finish = (r: CheckResult) => {
      if (done) return;
      done = true;
      try { socket.close(); } catch {}
      resolve(r);
    };
    const timer = setTimeout(() => {
      if (m.keyword) finish({ up: false, message: "No matching UDP response (timeout)" });
      else finish({ up: true, responseTimeMs: Math.round(performance.now() - start), message: "Datagram sent (no reply expected)" });
    }, m.timeoutSeconds * 1000);

    socket.once("message", (msg) => {
      clearTimeout(timer);
      const text = msg.toString("utf8");
      if (m.keyword && !text.includes(m.keyword))
        return finish({ up: false, responseTimeMs: Math.round(performance.now() - start), message: "UDP reply did not match keyword" });
      finish({ up: true, responseTimeMs: Math.round(performance.now() - start), message: "UDP reply received" });
    });
    socket.once("error", (err) => {
      clearTimeout(timer);
      finish({ up: false, message: err.message });
    });
    const payload = Buffer.from(m.requestBody || "ping");
    socket.send(payload, m.port, m.host, (err) => {
      if (err) {
        clearTimeout(timer);
        finish({ up: false, message: err.message });
      }
    });
  });
}

// ───────────────────── DNS ─────────────────────
export async function checkDns(m: Monitor): Promise<CheckResult> {
  const name = m.host || (m.url ?? "");
  if (!name) return { up: false, message: "No hostname configured" };
  const resolver = new dns.Resolver({ timeout: m.timeoutSeconds * 1000, tries: 1 });
  if (m.dnsResolver) resolver.setServers([m.dnsResolver]);
  const type = (m.dnsRecordType || "A").toUpperCase();
  const start = performance.now();
  try {
    const records = (await resolver.resolve(name, type as never)) as unknown[];
    const ms = Math.round(performance.now() - start);
    const flat = records.map((r) => (typeof r === "object" ? JSON.stringify(r) : String(r))).join(", ");
    if (!records || records.length === 0) return { up: false, responseTimeMs: ms, message: "No records returned" };
    if (m.dnsExpected && !flat.includes(m.dnsExpected))
      return { up: false, responseTimeMs: ms, message: `Expected "${m.dnsExpected}" not in [${flat}]` };
    return { up: true, responseTimeMs: ms, message: `${type}: ${flat}` };
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    return { up: false, responseTimeMs: ms, message: e instanceof Error ? e.message : "DNS resolution failed" };
  }
}

// ───────────────────── PING (ICMP) ─────────────────────
export function checkPing(m: Monitor): Promise<CheckResult> {
  return new Promise((resolve) => {
    const host = m.host || (m.url ?? "");
    if (!host) return resolve({ up: false, message: "No host configured" });
    const timeoutS = Math.max(1, m.timeoutSeconds);
    // -c 1 one packet, -W timeout (seconds, Linux), -n numeric
    const child = spawn("ping", ["-n", "-c", "1", "-W", String(timeoutS), host]);
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    const killer = setTimeout(() => child.kill("SIGKILL"), (timeoutS + 2) * 1000);
    child.on("close", (code) => {
      clearTimeout(killer);
      if (code === 0) {
        const match = out.match(/time[=<]([\d.]+)\s*ms/);
        const ms = match ? Math.round(parseFloat(match[1])) : undefined;
        resolve({ up: true, responseTimeMs: ms, message: `Reachable${ms != null ? ` (${ms}ms)` : ""}` });
      } else {
        resolve({ up: false, message: "Host unreachable" });
      }
    });
    child.on("error", () => {
      clearTimeout(killer);
      resolve({ up: false, message: "ping command unavailable" });
    });
  });
}

export async function runCheck(m: Monitor): Promise<CheckResult> {
  switch (m.type) {
    case "HTTP":
    case "API":
      return checkHttp(m);
    case "TCP":
      return checkTcp(m);
    case "UDP":
      return checkUdp(m);
    case "DNS":
      return checkDns(m);
    case "PING":
      return checkPing(m);
    default:
      return { up: false, message: `Unsupported type ${m.type}` };
  }
}
