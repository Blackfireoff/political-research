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
  const original = "Le RN propose 62 ans [9]. Elle a dit « en sortir totalement » [8]. La réforme Retirement est progressive.";
  it("accepte une correction de forme", () => {
    expect(acceptProofread(original, original.replace("Retirement", "des retraites"))).toBe(true);
  });
  it("rejette une modification de chiffre, de citation ou de guillemets", () => {
    expect(acceptProofread(original, original.replace("62", "60"))).toBe(false);
    expect(acceptProofread(original, original.replace("[9]", "[3]"))).toBe(false);
    expect(acceptProofread(original, original.replace("totalement", "progressivement"))).toBe(false);
  });
  it("rejette une réécriture trop longue ou vide", () => {
    expect(acceptProofread(original, `${original} ${original}`)).toBe(false);
    expect(acceptProofread(original, "")).toBe(false);
  });
});
