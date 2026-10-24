import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import MiniSearch from "minisearch";
import { CHUNKS_PATH } from "./storage";
import { tokenize } from "./text";
import type { DocChunk } from "./types";

interface LoadedIndex {
  mtimeMs: number;
  search: MiniSearch<DocChunk>;
  chunks: Map<string, DocChunk>;
}

const globalState = globalThis as unknown as { __docIndex?: LoadedIndex };

/** Charge l'index des passages, en le rechargeant si le fichier a été régénéré par l'ingestion. */
async function loadIndex(): Promise<LoadedIndex | null> {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(CHUNKS_PATH).mtimeMs;
  } catch {
    return null;
  }
  if (globalState.__docIndex?.mtimeMs === mtimeMs) return globalState.__docIndex;

  const chunks: DocChunk[] = JSON.parse(await readFile(CHUNKS_PATH, "utf8"));
  const search = new MiniSearch<DocChunk>({
    fields: ["text", "title"],
    storeFields: ["id"],
    tokenize: (text) => tokenize(text),
    processTerm: (term) => term,
    searchOptions: { boost: { title: 0.5 }, prefix: (term) => term.length > 4, fuzzy: (term) => (term.length > 6 ? 0.15 : false) },
  });
  search.addAll(chunks);
  globalState.__docIndex = { mtimeMs, search, chunks: new Map(chunks.map((c) => [c.id, c])) };
  return globalState.__docIndex;
}

export interface DocHit extends DocChunk {
  score: number;
}

/**
 * Recherche plein texte dans les programmes. `perParty` limite le nombre de passages
 * par parti pour qu'aucun parti ne monopolise le contexte.
 */
export async function searchDocs(
  query: string,
  { limit = 12, partyIds, perParty = 3 }: { limit?: number; partyIds?: string[]; perParty?: number } = {},
): Promise<DocHit[]> {
  const index = await loadIndex();
  if (!index || !query.trim()) return [];
  const results = index.search.search(query, { combineWith: "OR" });
  const hits: DocHit[] = [];
  const countByParty = new Map<string, number>();
  for (const r of results) {
    const chunk = index.chunks.get(r.id as string);
    if (!chunk) continue;
    if (partyIds?.length && !chunk.partyIds.some((id) => partyIds.includes(id))) continue;
    const key = chunk.partyIds.join(",");
    const count = countByParty.get(key) ?? 0;
    if (count >= perParty) continue;
    countByParty.set(key, count + 1);
    hits.push({ ...chunk, score: r.score });
    if (hits.length >= limit) break;
  }
  return hits;
}

export async function indexedChunkCount(): Promise<number> {
  return (await loadIndex())?.chunks.size ?? 0;
}
