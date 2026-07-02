import { prisma } from "./db";
import { getSettings, publicUrl } from "./settings";
import { incidentStatusMeta } from "./status";

function esc(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

async function feedData() {
  const settings = await getSettings();
  const base = publicUrl(settings);
  const incidents = await prisma.incident.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { updates: { orderBy: { createdAt: "desc" } }, monitor: true },
  });
  return { settings, base, incidents };
}

export async function buildRss(): Promise<string> {
  const { settings, base, incidents } = await feedData();
  const items = incidents
    .map((inc) => {
      const latest = inc.updates[0];
      const desc = inc.updates
        .map((u) => `<b>${incidentStatusMeta[u.status].label}</b> — ${esc(u.body)} (${u.createdAt.toUTCString()})`)
        .join("<br/>");
      return `<item>
  <title>${esc(inc.title)} [${incidentStatusMeta[inc.status].label}]</title>
  <link>${base}/incidents/${inc.id}</link>
  <guid isPermaLink="false">${inc.id}-${latest?.id ?? "0"}</guid>
  <pubDate>${(latest?.createdAt ?? inc.createdAt).toUTCString()}</pubDate>
  <description>${esc(desc)}</description>
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(settings.siteName)} — Incident updates</title>
<link>${base}</link>
<description>${esc(settings.siteDescription)}</description>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel></rss>`;
}

export async function buildAtom(): Promise<string> {
  const { settings, base, incidents } = await feedData();
  const entries = incidents
    .map((inc) => {
      const latest = inc.updates[0];
      const updated = (latest?.createdAt ?? inc.createdAt).toISOString();
      const content = inc.updates
        .map((u) => `${incidentStatusMeta[u.status].label}: ${u.body} (${u.createdAt.toISOString()})`)
        .join("\n");
      return `<entry>
  <title>${esc(inc.title)} [${incidentStatusMeta[inc.status].label}]</title>
  <link href="${base}/incidents/${inc.id}"/>
  <id>urn:incident:${inc.id}:${latest?.id ?? "0"}</id>
  <updated>${updated}</updated>
  <summary>${esc(content)}</summary>
</entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${esc(settings.siteName)} — Incident updates</title>
<link href="${base}"/>
<link rel="self" href="${base}/atom"/>
<id>${base}/</id>
<updated>${new Date().toISOString()}</updated>
${entries}
</feed>`;
}
