import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { stripHtml } from "./text";

/** Extrait le texte principal d'une page HTML (article, programme), sans menus ni pieds de page. */
export function extractReadableText(html: string, url: string): { title: string; text: string; published: string | null } {
  try {
    const { document } = parseHTML(html);
    const published =
      document.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ??
      document.querySelector("time[datetime]")?.getAttribute("datetime") ??
      null;
    const article = new Readability(document as unknown as Document, { charThreshold: 200 }).parse();
    if (article?.textContent && article.textContent.trim().length > 200) {
      return {
        title: article.title ?? "",
        text: article.textContent.replace(/\s+/g, " ").trim(),
        published,
      };
    }
    return { title: document.title ?? "", text: stripHtml(document.body?.innerHTML ?? html), published };
  } catch {
    console.warn(`[web-page] extraction impossible pour ${url}`);
    return { title: "", text: stripHtml(html), published: null };
  }
}

const MAX_REDIRECTS = 3;

/** Plages non routables publiquement : boucle locale, réseaux privés, lien local (métadonnées cloud)… */
const blockedRanges = (() => {
  const list = new BlockList();
  for (const [net, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["224.0.0.0", 3],
  ] as const)
    list.addSubnet(net, prefix, "ipv4");
  for (const [net, prefix] of [
    ["::", 128],
    ["::1", 128],
    ["64:ff9b::", 96],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
  ] as const)
    list.addSubnet(net, prefix, "ipv6");
  return list;
})();

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  if (family === 6 && address.toLowerCase().startsWith("::ffff:")) {
    const v4 = address.slice(7);
    if (isIP(v4) === 4) return blockedRanges.check(v4, "ipv4");
  }
  return blockedRanges.check(address, family === 4 ? "ipv4" : "ipv6");
}

/**
 * Refuse les URL qui ne visent pas une adresse publique en http(s) : les URL proviennent de
 * résultats de recherche externes et ne doivent pas permettre d'atteindre le réseau interne.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Schéma non autorisé");
  if (url.username || url.password) throw new Error("Identifiants dans l'URL refusés");
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address)))
    throw new Error("Adresse non publique");
  return url;
}

/** Télécharge une page et renvoie son texte principal, ou null en cas d'échec / de contenu non HTML. */
export async function fetchPageText(url: string, timeoutMs = 7000) {
  try {
    const signal = AbortSignal.timeout(timeoutMs);
    let current = url;
    // Redirections suivies à la main pour revalider chaque destination.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(current);
      const res = await fetch(current, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Recoupe/0.1; verification de faits)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr-FR,fr;q=0.9",
        },
        redirect: "manual",
        signal,
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        current = new URL(location, current).toString();
        continue;
      }
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("html")) return null;
      return extractReadableText(await res.text(), current);
    }
    return null;
  } catch {
    return null;
  }
}
