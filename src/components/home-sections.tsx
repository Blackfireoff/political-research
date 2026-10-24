"use client";

import { useState, type ReactNode } from "react";

/**
 * Smartphone : un onglet à la fois (Actualité / Candidatures) pour éviter un long défilement.
 * Grand écran : les deux colonnes côte à côte.
 */
export function HomeSections({ news, candidates }: { news: ReactNode; candidates: ReactNode }) {
  const [tab, setTab] = useState<"news" | "candidates">("news");
  const tabs = [
    { id: "news", label: "Actualité" },
    { id: "candidates", label: "Candidatures" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-10 lg:pt-10">
      <div role="tablist" aria-label="Sections" className="mb-5 grid grid-cols-2 rounded-full border border-rule p-1 lg:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className="h-9 rounded-full text-sm text-graphite aria-selected:bg-ink aria-selected:font-semibold aria-selected:text-paper"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div role="tabpanel" id="panel-news" aria-labelledby="tab-news" className={tab === "news" ? "" : "hidden lg:block"}>
          {news}
        </div>
        <div
          role="tabpanel"
          id="panel-candidates"
          aria-labelledby="tab-candidates"
          className={tab === "candidates" ? "" : "hidden lg:block"}
        >
          {candidates}
        </div>
      </div>
    </div>
  );
}
