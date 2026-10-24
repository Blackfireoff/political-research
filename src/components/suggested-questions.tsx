import Link from "next/link";
import { connection } from "next/server";
import { getSuggestions } from "@/lib/suggestions";

/** Deux ou trois questions générées par l'IA d'après l'actualité (cache de 6 heures). */
export async function SuggestedQuestions() {
  // Générées à l'exécution, jamais pendant le build (la clé API n'y est pas disponible).
  await connection();
  const suggestions = await getSuggestions();
  if (!suggestions.length) return null;
  return (
    <ul
      aria-label="Questions suggérées d'après l'actualité"
      className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:px-4 lg:flex-wrap [&::-webkit-scrollbar]:hidden"
    >
      {suggestions.map((s) => (
        <li key={s} className="shrink-0">
          <Link
            href={`/?q=${encodeURIComponent(s)}`}
            className="flex h-9 items-center rounded-full border border-rule px-3 text-sm whitespace-nowrap text-graphite hover:border-ink hover:text-ink"
          >
            {s}
          </Link>
        </li>
      ))}
    </ul>
  );
}
