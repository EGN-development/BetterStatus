import { buildRss } from "@/lib/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const xml = await buildRss();
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
