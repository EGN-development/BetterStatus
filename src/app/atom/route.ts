import { buildAtom } from "@/lib/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const xml = await buildAtom();
  return new Response(xml, {
    headers: { "content-type": "application/atom+xml; charset=utf-8" },
  });
}
