import { profileForUrl, reliabilityRank } from "./data";
import { fetchPageText } from "./web-page";
import { truncate } from "./text";
import type { SourceProfile } from "./types";

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
  source: SourceProfile;
  content: string | null;
}

interface SearxResult {
  title: string;
  url: string;
  content?: string;
  publishedDate?: string | null;
}

export function webSearchEnabled(): boolean {
  return Boolean(process.env.SEARXNG_URL);
}

/** Recherche via l'instance SearXNG auto-hébergée (format JSON). */
async function searx(query: string): Promise<SearxResult[]> {
  const base = process.env.SEARXNG_URL;
  if (!base) return [];
  const url = new URL("/search", base);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "fr-FR");
  url.searchParams.set("safesearch", "0");
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`SearXNG HTTP ${res.status}`);
  const data = (await res.json()) as { results?: SearxResult[] };
  return data.results ?? [];
}

/**
 * Cherche sur le web, classe les résultats par fiabilité de la source,
 * écarte les sources jugées faibles et récupère le texte des meilleures pages.
 */
export async function searchWeb(
  query: string,
  { maxPages = 5 }: { maxPages?: number } = {},
): Promise<{ results: WebResult[]; excluded: { url: string; title: string; reason: string }[] }> {
  const raw = await searx(query);
  const seen = new Set<string>();
  const excluded: { url: string; title: string; reason: string }[] = [];
  const candidates = raw
    .filter((r) => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    })
    .map((r, i) => ({ r, i, source: profileForUrl(r.url) }))
    .filter(({ r, source }) => {
      if (source.reliability === "faible") {
        excluded.push({ url: r.url, title: r.title, reason: `${source.name} : réseau social, non retenu comme preuve` });
        return false;
      }
      return true;
    })
    // Fiabilité d'abord, puis pertinence du moteur.
    .sort((a, b) => reliabilityRank(b.source.reliability) - reliabilityRank(a.source.reliability) || a.i - b.i)
    .slice(0, maxPages);

  const results = await Promise.all(
    candidates.map(async ({ r, source }) => {
      const page = await fetchPageText(r.url);
      return {
        title: r.title || page?.title || r.url,
        url: r.url,
        snippet: r.content ?? "",
        publishedAt: r.publishedDate ?? page?.published ?? null,
        source,
        content: page?.text ? truncate(page.text, 3500) : null,
      } satisfies WebResult;
    }),
  );
  return { results, excluded };
}
