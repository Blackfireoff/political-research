// Outils texte purs (sans dépendance Next), testés unitairement.

const STOPWORDS = new Set(
  (
    "a au aux avec ce ces cet cette dans de des du elle en et eux il ils je la le les leur leurs lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c d j l m n s t y est sont ete etre avoir ont fait faire plus tout tous toute toutes comme si sans sous entre aussi donc car ni or dont quel quelle quels quelles"
  ).split(" "),
);

/** Minuscules, sans accents, ponctuation remplacée par des espaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9%€\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Nettoie le texte extrait d'un PDF : césures, espaces multiples. */
export function cleanPdfText(text: string): string {
  return text
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Découpe le texte d'une page en passages d'environ `size` caractères,
 * en coupant de préférence en fin de phrase, avec un léger recouvrement.
 */
export function chunkText(text: string, size = 1100, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(" • "));
      if (lastStop > size * 0.5) end = start + lastStop + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

/** Numéros de citation [n] présents dans un texte (gère aussi [1, 3] et [2][4]). */
export function extractCitations(text: string): number[] {
  const found = new Set<number>();
  for (const m of text.matchAll(/\[(\d+(?:\s*[,;]\s*\d+)*)\]/g)) {
    for (const n of m[1].split(/[,;]/)) found.add(Number(n.trim()));
  }
  return [...found].sort((a, b) => a - b);
}

/** Supprime les blocs de raisonnement <think>…</think> éventuellement renvoyés dans le contenu. */
export function createThinkStripper() {
  let inThink = false;
  let buffer = "";
  return (chunk: string): string => {
    buffer += chunk;
    let out = "";
    while (buffer.length) {
      if (inThink) {
        const close = buffer.indexOf("</think>");
        if (close === -1) {
          buffer = buffer.slice(Math.max(0, buffer.length - 8));
          return out;
        }
        buffer = buffer.slice(close + "</think>".length);
        inThink = false;
      } else {
        const open = buffer.indexOf("<think>");
        if (open === -1) {
          // Garde une éventuelle balise ouvrante coupée en fin de tampon.
          const partial = buffer.lastIndexOf("<");
          if (partial !== -1 && "<think>".startsWith(buffer.slice(partial))) {
            out += buffer.slice(0, partial);
            buffer = buffer.slice(partial);
          } else {
            out += buffer;
            buffer = "";
          }
          return out;
        }
        out += buffer.slice(0, open);
        buffer = buffer.slice(open + "<think>".length);
        inThink = true;
      }
    }
    return out;
  };
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max * 0.8 ? lastSpace : max)}…`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "’")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Retire les caractères chinois, japonais ou coréens parasites qu'un modèle peut glisser dans une réponse française. */
export function stripCjk(text: string): string {
  return text.replace(/[　-ヿ㐀-䶿一-鿿가-힯＀-￯]+/g, "").replace(/ {2,}/g, " ");
}

/**
 * Empreinte factuelle d'un texte : nombres, citations [n] et passages entre guillemets.
 * Une relecture qui modifie cette empreinte a changé le fond et doit être rejetée.
 */
export function factsSignature(text: string): string {
  const numbers = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const quotes = (text.match(/«[^»]*»/g) ?? []).map((q) => q.replace(/\s+/g, " "));
  return JSON.stringify([numbers, quotes]);
}

// Mots qui portent le sens d'une affirmation : une relecture ne doit jamais les ajouter ni les retirer.
const PROTECTED_WORDS = new Set(
  "ne n pas non jamais aucun aucune ni sans rien guere plus exact exacte faux fausse trompeur trompeuse inverifiable plutot verdict".split(
    " ",
  ),
);

function wordKey(token: string): string {
  return normalize(token).replace(/\s+/g, "");
}

function isProtected(token: string): boolean {
  if (/\d|\[\d/.test(token)) return true;
  return normalize(token)
    .split(" ")
    .some((part) => PROTECTED_WORDS.has(part));
}

/** Différences mot à mot (plus longue sous-séquence commune), regroupées en blocs contigus. */
function wordHunks(a: string[], b: string[]): { removed: string[]; added: string[] }[] {
  const n = a.length;
  const m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const hunks: { removed: string[]; added: string[] }[] = [];
  let current: { removed: string[]; added: string[] } | null = null;
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      current = null;
      i++;
      j++;
      continue;
    }
    if (!current) hunks.push((current = { removed: [], added: [] }));
    if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) current.added.push(b[j++]);
    else current.removed.push(a[i++]);
  }
  return hunks;
}

/**
 * Accepte une version relue seulement si elle ne fait que de petites retouches locales :
 * fond identique (chiffres, citations, guillemets, ligne de verdict), aucune négation ni mot
 * de verdict touché, aucun nom propre remplacé, et peu de mots modifiés au total.
 */
export function acceptProofread(original: string, revised: string): boolean {
  if (!revised.trim()) return false;
  const ratio = revised.length / Math.max(original.length, 1);
  if (ratio <= 0.85 || ratio >= 1.15) return false;
  if (factsSignature(original) !== factsSignature(revised)) return false;
  const verdict = (t: string) => t.match(/verdict[^\n]*/i)?.[0] ?? "";
  if (verdict(original) !== verdict(revised)) return false;

  const a = original.split(/\s+/).filter(Boolean);
  const b = revised.split(/\s+/).filter(Boolean);
  const hunks = wordHunks(a, b);
  const changed = hunks.reduce((acc, h) => acc + h.removed.length + h.added.length, 0);
  if (changed > Math.max(6, Math.round(a.length * 0.04))) return false;

  return hunks.every(({ removed, added }) => {
    if (removed.length > 3 || added.length > 3) return false;
    // Simple découpage ou recollage de mots (« LeRN » en « Le RN ») : toujours acceptable.
    if (removed.join("") === added.join("")) return true;
    if ([...removed, ...added].some(isProtected)) return false;
    // Un mot à majuscule (nom propre, parti) ne peut pas disparaître ni être remplacé.
    const addedKeys = new Set(added.map(wordKey));
    return removed.every((w) => !/^[«(]?[A-ZÀ-Ý]/.test(w) || addedKeys.has(wordKey(w)));
  });
}
