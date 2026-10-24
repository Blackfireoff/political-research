import { describe, expect, it } from "vitest";
import { acceptProofread, chunkText, createThinkStripper, extractCitations, normalize, stripCjk, tokenize } from "./text";

describe("normalize / tokenize", () => {
  it("retire accents, casse et mots vides", () => {
    expect(normalize("Électricité : l'État")).toBe("electricite l etat");
    expect(tokenize("La retraite à 60 ans pour les salariés")).toEqual(["retraite", "60", "ans", "salaries"]);
  });
});

describe("chunkText", () => {
  it("garde un texte court en un seul passage", () => {
    expect(chunkText("Une mesure.")).toEqual(["Une mesure."]);
  });
  it("découpe un long texte en passages bornés qui couvrent tout le texte", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Phrase numéro ${i} du programme.`).join(" ");
    const chunks = chunkText(text, 300, 50);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
    expect(chunks.at(-1)).toContain("Phrase numéro 59");
  });
});

describe("extractCitations", () => {
  it("repère les formes [n], [n][m] et [n, m]", () => {
    expect(extractCitations("Oui [2]. Aussi [1][4] et [3, 5].")).toEqual([1, 2, 3, 4, 5]);
  });
  it("ignore les liens markdown sans numéro", () => {
    expect(extractCitations("[texte](http://x)")).toEqual([]);
  });
});

describe("createThinkStripper", () => {
  it("supprime un bloc de raisonnement découpé entre plusieurs morceaux", () => {
    const strip = createThinkStripper();
    const out = ["Avant <thi", "nk>secret ", "raisonnement</th", "ink>Après"].map(strip).join("");
    expect(out).toBe("Avant Après");
  });
  it("laisse passer un texte sans balise", () => {
    const strip = createThinkStripper();
    expect(strip("a < b et c")).toBe("a < b et c");
  });
});

describe("stripCjk", () => {
  it("retire les caractères parasites sans toucher au français", () => {
    expect(stripCjk("la proposition银行存款 de 2024 est rejetée")).toBe("la proposition de 2024 est rejetée");
    expect(stripCjk("Élection présidentielle, « 60 ans »")).toBe("Élection présidentielle, « 60 ans »");
  });
});

describe("acceptProofread", () => {
  const original =
    "**Verdict : Faux**\n\nLe RN ne propose pas la retraite à 60 ans pour tous [9]. Marine Le Pen a dit « 62 ans » [8]. Les beginnings professionnels comptent. LeRN maintient sa ligne et la réforme reste progressive selon les sources disponibles.";
  it("accepte une correction de forme locale", () => {
    expect(acceptProofread(original, original.replace("beginnings", "débuts"))).toBe(true);
    expect(acceptProofread(original, original.replace("LeRN", "Le RN"))).toBe(true);
  });
  it("rejette une modification de chiffre, de citation ou de guillemets", () => {
    expect(acceptProofread(original, original.replace("60", "65"))).toBe(false);
    expect(acceptProofread(original, original.replace("[9]", "[3]"))).toBe(false);
    expect(acceptProofread(original, original.replace("« 62 ans »", "« 64 ans »"))).toBe(false);
  });
  it("rejette un changement de verdict ou de négation", () => {
    expect(acceptProofread(original, original.replace("Verdict : Faux", "Verdict : Exact"))).toBe(false);
    expect(acceptProofread(original, original.replace("ne propose pas", "propose"))).toBe(false);
  });
  it("rejette le remplacement d'un nom propre", () => {
    expect(acceptProofread(original, original.replace("Marine Le Pen", "Marine Tondelier"))).toBe(false);
  });
  it("rejette une réécriture trop large, trop longue ou vide", () => {
    const rewritten = original.replace(
      "la réforme reste progressive selon les sources disponibles",
      "la réforme demeure graduelle d'après les éléments consultés ici",
    );
    expect(acceptProofread(original, rewritten)).toBe(false);
    expect(acceptProofread(original, `${original} ${original}`)).toBe(false);
    expect(acceptProofread(original, "")).toBe(false);
  });
});
