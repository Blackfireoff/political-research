import partiesJson from "../../data/parties.json";
import sourcesJson from "../../data/sources.json";
import feedsJson from "../../data/feeds.json";
import { normalize } from "./text";
import type { Party, PartiesFile, Reliability, SourceCategory, SourceProfile } from "./types";

export const partiesFile = partiesJson as unknown as PartiesFile;

/** Partis triés par ordre alphabétique : aucun ordre de préférence. */
export const parties: Party[] = [...partiesFile.parties].sort((a, b) => a.name.localeCompare(b.name, "fr"));

export function getParty(id: string): Party | undefined {
  return parties.find((p) => p.id === id);
}

export const feeds = feedsJson.feeds;

type CategoryInfo = { label: string; reliability: Reliability; description: string };
export const sourceCategories = sourcesJson.categories as Record<SourceCategory, CategoryInfo>;
export const sourcesMethodology = sourcesJson.methodology;

const catalog: SourceProfile[] = sourcesJson.sources.map((s) => ({
  ...s,
  category: s.category as SourceCategory,
  reliability: sourceCategories[s.category as SourceCategory].reliability,
}));

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Domaines des partis et de leurs documents, détectés à partir de parties.json. */
const partisanProfiles: SourceProfile[] = (() => {
  const byHost = new Map<string, SourceProfile>();
  // Sites officiels d'abord : un document commun hébergé chez un parti reste attribué à ce parti.
  const entries = [
    ...partiesFile.parties.map((p) => ({ p, url: p.officialWebsite })),
    ...partiesFile.parties.flatMap((p) => p.programmes.map((d) => ({ p, url: d.url }))),
  ];
  for (const { p, url } of entries) {
    const host = hostOf(url);
    if (!host || byHost.has(host)) continue;
    byHost.set(host, {
      domain: host,
      name: `Site partisan (${p.shortName})`,
      category: "partisan",
      reliability: sourceCategories.partisan.reliability,
      orientation: p.orientation?.label ?? null,
      ref: p.orientation?.sourceUrl,
    });
  }
  return [...byHost.values()];
})();

const allProfiles = [...catalog, ...partisanProfiles];

/** Profil de la source correspondant à une URL (correspondance la plus spécifique). */
export function profileForUrl(url: string): SourceProfile {
  const host = hostOf(url);
  if (!host) return unknownProfile(url);
  let path = "";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {}
  let best: SourceProfile | null = null;
  let bestScore = -1;
  for (const profile of allProfiles) {
    const [domain, ...rest] = profile.domain.split("/");
    const prefix = rest.length ? `/${rest.join("/")}` : "";
    const hostMatch = host === domain || host.endsWith(`.${domain}`);
    if (!hostMatch || (prefix && !path.startsWith(prefix))) continue;
    const score = profile.domain.length;
    if (score > bestScore) {
      best = profile;
      bestScore = score;
    }
  }
  return best ?? unknownProfile(url);
}

function unknownProfile(url: string): SourceProfile {
  return {
    domain: hostOf(url) ?? url,
    name: hostOf(url) ?? "Source inconnue",
    category: "inconnu",
    reliability: "non-evaluee",
    orientation: null,
  };
}

const RELIABILITY_RANK: Record<Reliability, number> = {
  officielle: 4,
  elevee: 3,
  "a-recouper": 2,
  "non-evaluee": 1,
  faible: 0,
};

export function reliabilityRank(r: Reliability): number {
  return RELIABILITY_RANK[r];
}

// Sigles qui sont aussi des mots courants (titres en majuscules).
const AMBIGUOUS_ACRONYMS = new Set(["LE", "LA", "LES", "DE", "DU", "UN", "ET", "EX"]);

/** Mots-clés permettant de rattacher un texte à un parti (noms, sigles, candidat, dirigeant). */
const partyMatchers = partiesFile.parties.map((p) => {
  const terms = new Set<string>();
  terms.add(normalize(p.name));
  for (const acronym of p.shortName.split(/[\s()/,]+/)) {
    // Sigles courts en majuscules : comparés en respectant la casse pour éviter les faux positifs.
    if (acronym.length >= 2 && acronym === acronym.toUpperCase() && /[A-Z]/.test(acronym) && !AMBIGUOUS_ACRONYMS.has(acronym))
      terms.add(`#${acronym}`);
  }
  if (p.candidate.name) terms.add(normalize(p.candidate.name));
  if (p.leader?.name) terms.add(normalize(p.leader.name));
  return { id: p.id, terms: [...terms] };
});

export function partiesMentioned(text: string): string[] {
  const norm = ` ${normalize(text)} `;
  const ids: string[] = [];
  for (const { id, terms } of partyMatchers) {
    const hit = terms.some((t) =>
      t.startsWith("#") ? new RegExp(`(^|[^A-Za-z])${t.slice(1)}([^A-Za-z]|$)`).test(text) : norm.includes(` ${t} `),
    );
    if (hit) ids.push(id);
  }
  return ids;
}
