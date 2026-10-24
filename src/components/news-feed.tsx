"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { SourceMeta } from "./source-badge";
import type { NewsItem } from "@/lib/types";

type PartyOption = { id: string; name: string; shortName: string };

const FOLLOW_KEY = "recoupe:suivis";

// Partis suivis : préférence propre à ce navigateur, conservée dans localStorage.
const followListeners = new Set<() => void>();

function subscribeFollowed(listener: () => void) {
  followListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    followListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function followedSnapshot(): string {
  try {
    return localStorage.getItem(FOLLOW_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function saveFollowed(ids: string[]) {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(ids));
  } catch {}
  followListeners.forEach((l) => l());
}

export function NewsFeed({
  items,
  parties,
  fetchedAt,
  failedFeeds,
}: {
  items: NewsItem[];
  parties: PartyOption[];
  fetchedAt: string;
  failedFeeds: string[];
}) {
  const followedRaw = useSyncExternalStore(subscribeFollowed, followedSnapshot, () => "[]");
  const followed = useMemo<string[]>(() => {
    try {
      return JSON.parse(followedRaw);
    } catch {
      return [];
    }
  }, [followedRaw]);
  const [filter, setFilter] = useState<"tous" | "suivis" | string>("tous");
  const [limit, setLimit] = useState(30);

  function toggleFollow(id: string) {
    const next = followed.includes(id) ? followed.filter((x) => x !== id) : [...followed, id];
    saveFollowed(next);
  }

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const item of items) for (const id of item.partyIds) c.set(id, (c.get(id) ?? 0) + 1);
    return c;
  }, [items]);

  const visible = items.filter((item) => {
    if (filter === "tous") return true;
    if (filter === "suivis") return item.partyIds.some((id) => followed.includes(id));
    return item.partyIds.includes(filter);
  });

  const shortName = (id: string) => parties.find((p) => p.id === id)?.shortName ?? id;
  // Partis les plus cités d'abord : les filtres utiles restent visibles sans défiler.
  const mentioned = parties.filter((p) => counts.get(p.id)).sort((a, b) => counts.get(b.id)! - counts.get(a.id)!);

  return (
    <section aria-labelledby="news-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="news-title" className="font-serif text-2xl font-semibold max-lg:sr-only">
          Fil d&apos;actualité politique
        </h2>
        <p className="text-xs text-graphite">
          {items.length} articles de {new Set(items.map((i) => i.feedId)).size} rédactions, mis à jour le{" "}
          {new Date(fetchedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      </div>
      <p className="mt-1 max-w-prose text-sm text-graphite">
        Titres repris tels quels de rédactions de lignes éditoriales différentes, orientation indiquée.
      </p>

      <div
        role="group"
        aria-label="Filtrer par parti"
        className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        <FilterChip active={filter === "tous"} onClick={() => setFilter("tous")}>
          Tout
        </FilterChip>
        <FilterChip active={filter === "suivis"} onClick={() => setFilter("suivis")} disabled={!followed.length}>
          Mes partis suivis{followed.length ? ` (${followed.length})` : ""}
        </FilterChip>
        {mentioned.map((p) => (
          <FilterChip key={p.id} active={filter === p.id} onClick={() => setFilter(p.id)}>
            {p.shortName} <span className="opacity-70">{counts.get(p.id)}</span>
          </FilterChip>
        ))}
      </div>

      {filter !== "tous" && filter !== "suivis" && (
        <button
          type="button"
          onClick={() => toggleFollow(filter)}
          aria-pressed={followed.includes(filter)}
          className="mt-2 inline-flex min-h-10 items-center text-sm underline underline-offset-2"
        >
          {followed.includes(filter) ? `Ne plus suivre ${shortName(filter)}` : `Suivre ${shortName(filter)}`}
        </button>
      )}

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-graphite">
          {filter === "suivis"
            ? "Aucun article récent ne mentionne les partis que vous suivez."
            : "Aucun article récent pour ce filtre."}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-rule border-y border-rule">
          {visible.slice(0, limit).map((item) => (
            <li key={item.id} className="py-4">
              <a href={item.link} target="_blank" rel="noreferrer" className="block font-medium leading-snug hover:underline">
                {item.title}
              </a>
              {item.summary && <p className="mt-1 line-clamp-2 text-sm text-graphite">{item.summary}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <SourceMeta source={item.source} />
                {item.publishedAt && (
                  <time dateTime={item.publishedAt} className="text-xs text-graphite">
                    {new Date(item.publishedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                )}
                {item.partyIds.length > 0 && (
                  <span className="text-xs text-graphite">Mentionne : {item.partyIds.map(shortName).join(", ")}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {visible.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + 30)}
          className="mt-4 h-11 w-full rounded-full border border-rule text-sm hover:border-ink lg:w-auto lg:px-6"
        >
          Afficher plus d&apos;articles
        </button>
      )}
      {failedFeeds.length > 0 && (
        <p className="mt-4 text-xs text-graphite">Flux momentanément indisponibles : {failedFeeds.join(", ")}.</p>
      )}
    </section>
  );
}

function FilterChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full border px-3.5 text-sm whitespace-nowrap disabled:opacity-40 ${
        active ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
