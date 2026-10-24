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
