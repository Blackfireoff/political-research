import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { partiesFile } from "./data";
import { CHUNKS_PATH, DOCS_DIR, MANIFEST_PATH, DATA_DIR } from "./storage";
import { chunkText, cleanPdfText } from "./text";
import { extractReadableText } from "./web-page";
import type { DocChunk, DocManifestEntry, Programme } from "./types";

const USER_AGENT = "Mozilla/5.0 (compatible; Recoupe/0.1; archivage de programmes politiques)";

export interface IngestStatus {
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  documents: number;
  chunks: number;
  errors: { url: string; message: string }[];
}

const globalState = globalThis as unknown as { __ingestStatus?: IngestStatus; __ingestPromise?: Promise<IngestStatus> };
globalState.__ingestStatus ??= { running: false, startedAt: null, finishedAt: null, documents: 0, chunks: 0, errors: [] };

export function ingestStatus(): IngestStatus {
  return globalState.__ingestStatus!;
}

export function docIdFor(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 12);
}

interface DocTarget {
  docId: string;
  programme: Programme;
  partyIds: string[];
}

/** Documents vérifiés de parties.json, dédoublonnés par URL (un même PDF peut être partagé). */
export function documentTargets(): DocTarget[] {
  const byUrl = new Map<string, DocTarget>();
  for (const party of partiesFile.parties) {
    for (const programme of party.programmes) {
      if (!programme.verified) continue;
      const existing = byUrl.get(programme.url);
      if (existing) existing.partyIds.push(party.id);
      else byUrl.set(programme.url, { docId: docIdFor(programme.url), programme, partyIds: [party.id] });
    }
  }
  return [...byUrl.values()];
}

export async function readManifest(): Promise<DocManifestEntry[]> {
  try {
    return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    return [];
  }
}

async function writeJsonAtomic(file: string, data: unknown) {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, file);
}

async function download(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/pdf,text/html;q=0.9,*/*;q=0.5" },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "" };
}

async function extractPdfPages(buffer: Buffer): Promise<string[]> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });
  return (text as string[]).map(cleanPdfText);
}

async function ingestOne(target: DocTarget, previous: DocManifestEntry | undefined, force: boolean) {
  const { programme, docId } = target;
  const isPdf = programme.format === "pdf";
  const file = `${docId}.${isPdf ? "pdf" : "txt"}`;
  const filePath = path.join(/*turbopackIgnore: true*/ DOCS_DIR, file);

  let buffer: Buffer;
  let downloadedAt = previous?.downloadedAt ?? new Date().toISOString();
  if (!force && previous && existsSync(/*turbopackIgnore: true*/ filePath)) {
    buffer = await readFile(/*turbopackIgnore: true*/ filePath);
  } else {
    const res = await download(programme.url);
    if (isPdf) {
      if (res.buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error(`Réponse non PDF (${res.contentType})`);
      buffer = res.buffer;
    } else {
      buffer = Buffer.from(extractReadableText(res.buffer.toString("utf8"), programme.url).text, "utf8");
    }
    await writeFile(filePath, buffer);
    downloadedAt = new Date().toISOString();
  }

  const pages = isPdf ? await extractPdfPages(buffer) : [buffer.toString("utf8")];
  const chunks: DocChunk[] = [];
  pages.forEach((pageText, i) => {
    chunkText(pageText).forEach((text, j) => {
      chunks.push({
        id: `${docId}-${i + 1}-${j}`,
        docId,
        partyIds: target.partyIds,
        title: programme.title,
        url: programme.url,
        year: programme.year,
        kind: programme.kind,
        page: i + 1,
        text,
      });
    });
  });

  const entry: DocManifestEntry = {
    docId,
    url: programme.url,
    title: programme.title,
    year: programme.year,
    kind: programme.kind,
    partyIds: target.partyIds,
    file,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.length,
    pages: pages.length,
    downloadedAt,
    origin: previous?.origin ?? "telechargement",
  };
  return { entry, chunks };
}

/**
 * Télécharge (ou relit depuis le disque) chaque document vérifié, extrait le texte page par page
 * et écrit l'index des passages. Les documents déjà archivés ne sont pas retéléchargés sauf `force`.
 */
export function runIngest({ force = false } = {}): Promise<IngestStatus> {
  if (globalState.__ingestPromise && ingestStatus().running) return globalState.__ingestPromise;
  const status = ingestStatus();
  Object.assign(status, { running: true, startedAt: new Date().toISOString(), finishedAt: null, errors: [] });

  globalState.__ingestPromise = (async () => {
    await mkdir(DOCS_DIR, { recursive: true });
    const previous = await readManifest();
    const manifest: DocManifestEntry[] = [];
    const allChunks: DocChunk[] = [];
    for (const target of documentTargets()) {
      const prev = previous.find((m) => m.docId === target.docId);
      try {
        const { entry, chunks } = await ingestOne(target, prev, force);
        manifest.push(entry);
        allChunks.push(...chunks);
        console.log(`[ingest] ${entry.title} : ${entry.pages} page(s), ${chunks.length} passage(s)`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        status.errors.push({ url: target.programme.url, message });
        console.warn(`[ingest] échec ${target.programme.url} : ${message}`);
        // On conserve l'archive précédente si le site est momentanément indisponible.
        if (prev && force) {
          try {
            const { entry, chunks } = await ingestOne(target, prev, false);
            manifest.push(entry);
            allChunks.push(...chunks);
          } catch {}
        }
      }
    }
    await writeJsonAtomic(MANIFEST_PATH, manifest);
    await writeJsonAtomic(CHUNKS_PATH, allChunks);
    Object.assign(status, {
      running: false,
      finishedAt: new Date().toISOString(),
      documents: manifest.length,
      chunks: allChunks.length,
    });
    return status;
  })().catch((err) => {
    status.running = false;
    status.errors.push({ url: "*", message: err instanceof Error ? err.message : String(err) });
    return status;
  });
  return globalState.__ingestPromise;
}

/**
 * Dépose manuellement la copie d'un document (quand le site du parti bloque les téléchargements
 * automatisés), puis réindexe. Le fichier doit être un PDF pour un document PDF.
 */
export async function importDocument(docId: string, buffer: Buffer): Promise<DocManifestEntry> {
  const target = documentTargets().find((t) => t.docId === docId);
  if (!target) throw new Error("Document inconnu.");
  // Évite qu'un archivage en cours n'écrase le manifeste juste après l'import.
  if (ingestStatus().running) await globalState.__ingestPromise;
  const isPdf = target.programme.format === "pdf";
  if (isPdf && buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("Le fichier n'est pas un PDF.");
  await mkdir(DOCS_DIR, { recursive: true });
  const placeholder: DocManifestEntry = {
    docId,
    url: target.programme.url,
    title: target.programme.title,
    year: target.programme.year,
    kind: target.programme.kind,
    partyIds: target.partyIds,
    file: `${docId}.${isPdf ? "pdf" : "txt"}`,
    sha256: "",
    bytes: buffer.length,
    pages: 0,
    downloadedAt: new Date().toISOString(),
    origin: "import-manuel",
  };
  await writeFile(path.join(/*turbopackIgnore: true*/ DOCS_DIR, placeholder.file), buffer);
  const { entry } = await ingestOne(target, placeholder, false);
  const manifest = (await readManifest()).filter((m) => m.docId !== docId);
  await writeJsonAtomic(MANIFEST_PATH, [...manifest, entry]);
  await runIngest();
  return entry;
}

export function indexExists(): boolean {
  return existsSync(CHUNKS_PATH) && existsSync(MANIFEST_PATH);
}

export { DATA_DIR };
