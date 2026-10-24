"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { SearchIcon } from "./icons";
import { KIND_LABELS } from "@/lib/labels";
import type { ProgrammeKind } from "@/lib/types";

export interface ViewerDoc {
  docId: string;
  title: string;
  url: string;
  kind: ProgrammeKind;
  year: number | null;
  format: "pdf" | "html";
  verified: boolean;
  note: string | null;
  archive: {
    sha256: string;
    bytes: number;
    pages: number;
    downloadedAt: string;
    origin: "telechargement" | "import-manuel";
  } | null;
}

type Hit = { docId: string; title: string; page: number; text: string };

export function DocViewer(props: { partyId: string; docs: ViewerDoc[]; ingestRunning: boolean }) {
  return (
    <Suspense fallback={null}>
      <Viewer {...props} />
    </Suspense>
  );
}

function Viewer({ partyId, docs, ingestRunning }: { partyId: string; docs: ViewerDoc[]; ingestRunning: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Par défaut : le programme 2027 s'il existe, sinon le premier PDF archivé.
  const selected =
    docs.find((d) => d.docId === searchParams.get("doc")) ??
    docs.find((d) => d.archive && d.format === "pdf" && d.kind === "presidentielle-2027") ??
    docs.find((d) => d.archive && d.format === "pdf") ??
    docs.find((d) => d.archive) ??
    docs[0];
  const page = Number(searchParams.get("page") ?? 1) || 1;

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);

  function open(docId: string, p = 1) {
    router.replace(`${pathname}?doc=${docId}&page=${p}`, { scroll: false });
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?party=${partyId}&q=${encodeURIComponent(query)}`);
      setHits(((await res.json()) as { hits: Hit[] }).hits);
    } finally {
      setSearching(false);
    }
  }

  if (!docs.length) {
    return (
      <p className="mt-10 rounded border border-rule p-4 text-sm text-graphite">
        Aucun document officiel n&apos;a été recensé pour ce parti. Consultez son site officiel ci-dessus.
      </p>
    );
  }

  const docUrl = (d: ViewerDoc, p = 1) => `/api/documents/${d.docId}${d.format === "pdf" ? `#page=${p}` : ""}`;

  return (
    <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
      <aside className="min-w-0 space-y-6">
        {/* Smartphone : sélecteur natif, plus simple au pouce qu'une longue liste. */}
        <div className="lg:hidden">
          <label htmlFor="doc-select" className="text-sm font-semibold">
            Document ({docs.length})
          </label>
          <select
            id="doc-select"
            value={selected?.docId}
            onChange={(e) => open(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-rule bg-surface px-3 text-base"
          >
            {docs.map((d) => (
              <option key={d.docId} value={d.docId}>
                {d.title} ({KIND_LABELS[d.kind]}
                {d.year ? `, ${d.year}` : ""})
              </option>
            ))}
          </select>
        </div>

        <nav aria-label="Documents du parti" className="hidden lg:block">
          <h2 className="text-sm font-semibold">Documents ({docs.length})</h2>
          <ul className="mt-2 space-y-1">
            {docs.map((d) => (
              <li key={d.docId}>
                <button
                  type="button"
                  onClick={() => open(d.docId)}
                  aria-current={d.docId === selected?.docId}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                    d.docId === selected?.docId ? "bg-ink text-paper" : "hover:bg-surface"
                  }`}
                >
                  <span className="block leading-snug">{d.title}</span>
                  <span className="text-xs opacity-75">
                    {KIND_LABELS[d.kind]}
                    {d.year ? `, ${d.year}` : ""}, {d.format.toUpperCase()}
                    {!d.archive ? ", non archivé" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {selected?.archive && (
          <a
            href={docUrl(selected, page)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper lg:hidden"
          >
            {selected.format === "pdf" ? `Ouvrir le PDF${page > 1 ? `, page ${page}` : ""}` : "Lire le texte archivé"}
          </a>
        )}

        <form onSubmit={search} role="search">
          <label htmlFor="doc-search" className="text-sm font-semibold">
            Chercher dans les documents du parti
          </label>
          <div className="mt-2 flex h-11 items-center rounded-full border border-rule bg-surface pl-4 focus-within:border-ink">
            <input
              id="doc-search"
              type="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="retraite, SMIC, nucléaire…"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              aria-label="Chercher"
              disabled={searching || !query.trim()}
              className="mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:bg-transparent disabled:text-graphite"
            >
              <SearchIcon className="size-[18px]" />
            </button>
          </div>
          <p className="mt-1 text-xs text-graphite">Recherche exacte dans le texte, sans IA.</p>
        </form>
        {hits && (
          <ul className="space-y-2" aria-label="Passages trouvés">
            {hits.length === 0 && <li className="text-sm text-graphite">Aucun passage trouvé.</li>}
            {hits.map((h, i) => {
              const doc = docs.find((d) => d.docId === h.docId);
              return (
                <li key={`${h.docId}-${h.page}-${i}`} className="rounded-lg border border-rule p-3 text-sm">
                  <p className="text-xs text-graphite">
                    <span className="font-semibold text-ink">Page {h.page}</span>, {h.title}
                  </p>
                  <p className="mt-1 line-clamp-4 leading-relaxed">{h.text}</p>
                  {doc && (
                    <a
                      href={docUrl(doc, h.page)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex min-h-9 items-center text-xs underline underline-offset-2 lg:hidden"
                    >
                      Ouvrir à la page {h.page}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => open(h.docId, h.page)}
                    className="mt-1 hidden text-xs underline underline-offset-2 lg:inline"
                  >
                    Afficher à la page {h.page}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {selected && (
        <section aria-label="Document sélectionné" className="min-w-0">
          <details className="text-xs" open>
            <summary className="cursor-pointer py-1 text-sm font-semibold lg:hidden">Provenance du document</summary>
            <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
              <dt className="text-graphite">Original</dt>
              <dd className="break-all">
                <a href={selected.url} target="_blank" rel="noreferrer" className="underline">
                  {selected.url}
                </a>
              </dd>
              {selected.archive && (
                <>
                  <dt className="text-graphite">Archivé le</dt>
                  <dd>
                    {new Date(selected.archive.downloadedAt).toLocaleString("fr-FR")}, {selected.archive.pages} page(s),{" "}
                    {(selected.archive.bytes / 1_048_576).toFixed(1)} Mo
                    {selected.archive.origin === "import-manuel" && ", copie déposée manuellement"}
                  </dd>
                  <dt className="text-graphite">SHA-256</dt>
                  <dd className="font-mono break-all">{selected.archive.sha256}</dd>
                </>
              )}
              {selected.note && (
                <>
                  <dt className="text-graphite">Note</dt>
                  <dd>{selected.note}</dd>
                </>
              )}
            </dl>
          </details>

          {selected.archive && selected.format === "pdf" ? (
            <iframe
              key={`${selected.docId}-${page}`}
              src={docUrl(selected, page)}
              title={selected.title}
              className="mt-4 hidden h-[80vh] w-full rounded border border-rule bg-surface lg:block"
            />
          ) : selected.archive ? (
            <p className="mt-4 hidden rounded border border-rule p-4 text-sm lg:block">
              Page web officielle : le texte extrait est{" "}
              <a href={docUrl(selected)} target="_blank" rel="noreferrer" className="underline">
                consultable ici
              </a>
              , l&apos;original sur le site du parti.
            </p>
          ) : (
            <p className="mt-4 rounded border border-rule p-4 text-sm text-graphite">
              {ingestRunning
                ? "Archivage en cours : rechargez la page dans quelques instants."
                : "Ce document n'a pas pu être archivé automatiquement (site indisponible ou protégé contre les robots). Consultez l'original via le lien ci-dessus."}
              {!ingestRunning && (
                <span className="mt-2 block text-xs">
                  Pour l&apos;archiver, téléchargez-le depuis votre navigateur puis déposez-le :{" "}
                  <code className="break-all">
                    curl -X POST -H &quot;Authorization: Bearer $ADMIN_TOKEN&quot; --data-binary @document.pdf
                    http://localhost:3000/api/documents/{selected.docId}
                  </code>
                </span>
              )}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
