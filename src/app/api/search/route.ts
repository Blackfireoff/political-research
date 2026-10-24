import { searchDocs } from "@/lib/doc-index";

/** Recherche plein texte dans les programmes archivés, sans IA. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, 200);
  const party = searchParams.get("party");
  const hits = await searchDocs(q, { limit: 30, perParty: 30, partyIds: party ? [party] : undefined });
  return Response.json({
    hits: hits.map(({ docId, title, page, text, kind, year, partyIds }) => ({ docId, title, page, text, kind, year, partyIds })),
  });
}
