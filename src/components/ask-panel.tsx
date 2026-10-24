"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalIcon, StopIcon } from "./icons";
import { SourceMeta } from "./source-badge";
import type { AskEvent, ContextSource } from "@/lib/types";

const TYPE_LABELS: Record<ContextSource["type"], string> = {
  fiche: "Données vérifiées",
  programme: "Document de parti",
  actualite: "Actualité",
  web: "Web",
};

type Excluded = { url: string; title: string; reason: string };

/** Transforme [2] ou [1, 3] en liens vers la source correspondante. */
function linkCitations(text: string): string {
  return text.replace(/\[(\d+(?:\s*[,;]\s*\d+)*)\](?!\()/g, (_, nums: string) =>
    nums
      .split(/[,;]/)
      .map((n) => `[${n.trim()}](#source-${n.trim()})`)
      .join(""),
  );
}

/** Zone de réponse de l'accueil : pilotée par le paramètre ?q= que remplit la barre de recherche. */
export function AskPanel({ suggestions }: { suggestions: ReactNode }) {
  const q = useSearchParams().get("q")?.trim() ?? "";
  if (!q) return suggestions;
  return <Answer key={q} question={q} />;
}

function Answer({ question }: { question: string }) {
  const [status, setStatus] = useState<string | null>("Collecte des sources…");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<ContextSource[]>([]);
  const [excluded, setExcluded] = useState<Excluded[]>([]);
  const [invalid, setInvalid] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    (async () => {
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Erreur ${res.status}`);
        }
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as AskEvent;
            if (event.type === "status") setStatus(event.message);
            else if (event.type === "sources") {
              setSources(event.sources);
              setExcluded(event.excluded);
            } else if (event.type === "delta") {
              setStatus(null);
              setAnswer((a) => a + event.text);
            } else if (event.type === "replace") setAnswer(event.text);
            else if (event.type === "done") setInvalid(event.invalidCitations);
            else if (event.type === "error") setError(event.message);
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      } finally {
        if (!controller.signal.aborted) {
          setRunning(false);
          setStatus(null);
        }
      }
    })();
    return () => controller.abort();
  }, [question]);

  function stop() {
    abortRef.current?.abort();
    setRunning(false);
    setStatus(null);
  }

  function focusSource(n: number) {
    const el = document.getElementById(`source-${n}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("source-flash");
    void el.offsetWidth;
    el.classList.add("source-flash");
  }

  const validNumbers = new Set(sources.map((s) => s.n));

  return (
    <section aria-label="Réponse" className="border-b border-rule bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-10 lg:py-8">
        <article aria-live="polite" aria-busy={running} className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-graphite">{question}</p>
            {running && (
              <button
                type="button"
                onClick={stop}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-rule px-3 text-sm"
              >
                <StopIcon className="size-4" />
                Arrêter
              </button>
            )}
          </div>
          {status && <p className="mt-3 animate-pulse text-sm text-graphite motion-reduce:animate-none">{status}</p>}
          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-bad/50 p-3 text-sm text-bad">
              La réponse n&apos;a pas pu être produite : {error}
            </p>
          )}
          {answer && (
            <div className="prose-answer mt-3">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => {
                    const m = href?.match(/^#source-(\d+)$/);
                    if (m) {
                      const n = Number(m[1]);
                      const ok = validNumbers.has(n);
                      const src = sources.find((s) => s.n === n);
                      return (
                        <a
                          href={href}
                          onClick={(e) => {
                            e.preventDefault();
                            focusSource(n);
                          }}
                          title={ok ? src?.title : "Source inexistante : citation non fiable"}
                          className={ok ? "cite" : "cite cite-invalid"}
                        >
                          {children}
                        </a>
                      );
                    }
                    return (
                      <a href={href} target="_blank" rel="noreferrer" className="underline">
                        {children}
                      </a>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {linkCitations(answer)}
              </ReactMarkdown>
            </div>
          )}
          {!running && invalid.length > 0 && (
            <p className="mt-4 rounded-lg border border-bad/50 p-3 text-sm text-bad">
              Attention : la réponse cite des sources qui n&apos;existent pas ({invalid.map((n) => `[${n}]`).join(", ")}).
              Les passages concernés ne sont pas étayés.
            </p>
          )}
          {!running && answer && (
            <p className="mt-5 border-t border-rule pt-3 text-xs text-graphite">
              Réponse rédigée par un modèle de langage à partir des seules sources listées. Touchez un numéro surligné
              pour voir sa source.
            </p>
          )}
        </article>

        {sources.length > 0 && (
          <aside aria-label="Sources utilisées" className="min-w-0">
            <h2 className="text-sm font-semibold">Sources fournies à l&apos;IA ({sources.length})</h2>
            <ol className="mt-3 space-y-2.5">
              {sources.map((s) => (
                <li key={s.n} id={`source-${s.n}`} className="scroll-mt-20 rounded-lg border border-rule bg-paper p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="cite shrink-0">{s.n}</span>
                    <span className="text-xs text-graphite">
                      {TYPE_LABELS[s.type]}
                      {s.date ? `, ${formatDate(s.date)}` : ""}
                      {s.page ? `, page ${s.page}` : ""}
                    </span>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-start gap-1 text-sm leading-snug font-medium hover:underline"
                  >
                    <span className="min-w-0 break-words">{s.title}</span>
                    <ExternalIcon className="mt-0.5 size-3.5 shrink-0 text-graphite" />
                  </a>
                  <div className="mt-1.5">
                    <SourceMeta source={s.source} />
                  </div>
                  {s.type === "programme" && s.docId && (
                    <Link
                      href={`/programmes/${s.partyIds?.[0]}?doc=${s.docId}&page=${s.page ?? 1}`}
                      className="mt-2 inline-flex min-h-9 items-center text-xs underline underline-offset-2"
                    >
                      Ouvrir le passage dans la copie archivée
                    </Link>
                  )}
                </li>
              ))}
            </ol>
            {excluded.length > 0 && (
              <details className="mt-4 text-xs text-graphite">
                <summary className="cursor-pointer py-2">Sources écartées ({excluded.length})</summary>
                <ul className="mt-1 space-y-1.5">
                  {excluded.map((e) => (
                    <li key={e.url} className="break-words">
                      <a href={e.url} target="_blank" rel="noreferrer" className="underline">
                        {e.title || e.url}
                      </a>{" "}
                      : {e.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  if (/^\d{4}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
