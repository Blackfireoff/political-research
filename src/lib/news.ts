import { cacheLife, cacheTag } from "next/cache";
import { createHash } from "node:crypto";
import { feeds, partiesMentioned, profileForUrl } from "./data";
import { stripHtml, truncate } from "./text";
import type { NewsItem } from "./types";

const MAX_AGE_DAYS = 14;

async function fetchFeed(feed: (typeof feeds)[number]): Promise<NewsItem[]> {
  const { default: Parser } = await import("rss-parser");
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Recoupe/0.1; lecteur RSS)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = await new Parser().parseString(await res.text());
    const source = profileForUrl(`https://${feed.domain}/`);
    return parsed.items
      .filter((item) => item.link && item.title)
      .map((item) => {
        const title = stripHtml(item.title!);
        const summary = truncate(stripHtml(item.contentSnippet ?? item.content ?? item.summary ?? ""), 320);
        return {
          id: createHash("sha1").update(item.link!).digest("hex").slice(0, 16),
          title,
          link: item.link!,
          summary,
          publishedAt: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : null),
          feedId: feed.id,
          source,
          partyIds: partiesMentioned(`${title} ${summary}`),
        };
      });
  } catch (err) {
    console.warn(`[news] flux ${feed.id} indisponible : ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/** Dernières actualités politiques de tous les flux, rafraîchies toutes les 15 minutes. */
export async function getNews(): Promise<{ items: NewsItem[]; fetchedAt: string; failedFeeds: string[] }> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  cacheTag("news");

  const results = await Promise.all(feeds.map(fetchFeed));
  const minDate = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const seen = new Set<string>();
  const items = results
    .flat()
    .filter((item) => {
      if (seen.has(item.link)) return false;
      seen.add(item.link);
      return !item.publishedAt || Date.parse(item.publishedAt) >= minDate;
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 400);
  return {
    items,
    fetchedAt: new Date().toISOString(),
    failedFeeds: feeds.filter((_, i) => results[i].length === 0).map((f) => f.id),
  };
}
