"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CloseIcon, SearchIcon } from "./icons";

/** Barre de question, présente sur toutes les pages : la réponse s'affiche sur l'accueil (/?q=…). */
export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("q") ?? "";
  const [value, setValue] = useState(current);
  const [synced, setSynced] = useState(current);

  // Suit la question de l'URL (suggestion cliquée, retour arrière) sans écraser la saisie en cours.
  if (current !== synced) {
    setSynced(current);
    setValue(current);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(`/?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="min-w-0 flex-1">
      <div className="flex h-11 items-center rounded-full border border-rule bg-surface pl-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] focus-within:border-ink">
        <label htmlFor="question" className="sr-only">
          Question ou affirmation à vérifier
        </label>
        <input
          id="question"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={600}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Vérifier une affirmation…"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-graphite/80 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Effacer"
            className="grid size-9 shrink-0 place-items-center rounded-full text-graphite hover:text-ink"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="Vérifier"
          disabled={!value.trim()}
          className="mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:bg-transparent disabled:text-graphite"
        >
          <SearchIcon className="size-[18px]" />
        </button>
      </div>
    </form>
  );
}

export function SearchBarFallback() {
  return <div className="h-11 min-w-0 flex-1 rounded-full border border-rule bg-surface" />;
}
