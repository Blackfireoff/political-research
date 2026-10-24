import { cacheLife, cacheTag } from "next/cache";
import { complete, llmConfigured } from "./llm";
import { getNews } from "./news";

const MAX_SUGGESTIONS = 3;
const MAX_LENGTH = 80;

/** Garde au plus trois questions courtes, bien formées, depuis la réponse du modèle. */
export function parseSuggestions(raw: string): string[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.replace(/\s+/g, " ").trim())
    .filter((q) => q.length >= 10 && q.length <= MAX_LENGTH && q.endsWith("?"))
    .slice(0, MAX_SUGGESTIONS);
}

/**
 * Questions suggérées, générées par l'IA à partir des titres d'actualité récents.
 * Mises en cache 6 heures ; en cas d'échec, nouvel essai quelques minutes plus tard.
 */
export async function getSuggestions(): Promise<string[]> {
  "use cache";
  cacheTag("suggestions");
  if (!llmConfigured()) {
    cacheLife("minutes");
    return [];
  }
  try {
    const { items } = await getNews();
    const titles = items
      .slice(0, 40)
      .map((i) => `- ${i.title}`)
      .join("\n");
    const raw = await complete([
      {
        role: "system",
        content: `Tu proposes des questions de vérification pour un outil citoyen et non partisan sur l'élection présidentielle française de 2027.
À partir des titres d'actualité fournis, propose ${MAX_SUGGESTIONS} questions courtes (70 caractères environ, ${MAX_LENGTH} au maximum, terminées par « ? ») qu'un citoyen pourrait poser pour vérifier un fait ou comparer les propositions des partis.
Chaque question doit porter sur la campagne présidentielle 2027 : candidatures, programmes ou propositions des partis sur un sujet d'actualité. Écarte les faits divers sans lien avec l'élection.
Règles : formulation neutre, sans présupposé ni affirmation ; aucun jugement de valeur ; ne cible pas un seul camp politique ; pas d'emoji.
Réponds uniquement par un tableau JSON de chaînes.`,
      },
      { role: "user", content: `Titres récents :\n${titles}` },
    ]);
    const suggestions = parseSuggestions(raw);
    if (!suggestions.length) console.warn(`[suggestions] réponse inexploitable : ${raw.slice(0, 300)}`);
    if (suggestions.length) cacheLife({ stale: 3600, revalidate: 21_600, expire: 86_400 });
    else cacheLife("minutes");
    return suggestions;
  } catch (err) {
    console.warn(`[suggestions] génération impossible : ${err instanceof Error ? err.message : err}`);
    cacheLife("minutes");
    return [];
  }
}
