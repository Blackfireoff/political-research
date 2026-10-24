import { describe, expect, it } from "vitest";
import { parties, partiesMentioned, profileForUrl } from "./data";

describe("profileForUrl", () => {
  it("classe une institution comme officielle, y compris en sous-domaine", () => {
    expect(profileForUrl("https://www.insee.fr/fr/statistiques").reliability).toBe("officielle");
    expect(profileForUrl("https://www.legifrance.gouv.fr/loda/id/1").category).toBe("institution");
  });
  it("préfère la correspondance la plus spécifique (rubrique de vérification)", () => {
    expect(profileForUrl("https://www.lemonde.fr/les-decodeurs/article/x").category).toBe("verification");
    expect(profileForUrl("https://www.lemonde.fr/politique/article/x").category).toBe("presse");
  });
  it("reconnaît les sites partisans à partir des données des partis", () => {
    expect(profileForUrl("https://rassemblementnational.fr/documents/x.pdf").category).toBe("partisan");
    expect(profileForUrl("https://lafranceinsoumise.fr/x").category).toBe("partisan");
    // Programme commun hébergé par LFI : attribué au parti qui l'héberge.
    expect(profileForUrl("https://lafranceinsoumise.fr/wp-content/uploads/2024/06/PROGRAMME-FRONT-POPULAIRE.pdf").name).toBe(
      "Site partisan (LFI)",
    );
  });
  it("signale les réseaux sociaux et les domaines inconnus", () => {
    expect(profileForUrl("https://x.com/compte/status/1").reliability).toBe("faible");
    expect(profileForUrl("https://blog-inconnu.example/article").reliability).toBe("non-evaluee");
  });
});

describe("partiesMentioned", () => {
  it("rattache un texte à un parti via son sigle ou son candidat", () => {
    const rn = parties.find((p) => p.shortName === "RN")!;
    expect(partiesMentioned("Le RN présente son contre-budget")).toContain(rn.id);
    expect(partiesMentioned(`Entretien avec ${rn.candidate.name}`)).toContain(rn.id);
  });
  it("ne confond pas un sigle avec un mot courant", () => {
    expect(partiesMentioned("LE GOUVERNEMENT ANNONCE UN PLAN")).toEqual([]);
  });
  it("trie les partis par ordre alphabétique", () => {
    const names = parties.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "fr")));
  });
});

describe("intégrité de parties.json", () => {
  it("chaque candidature « déclarée » repose sur au moins deux éditeurs distincts", () => {
    for (const p of parties.filter((x) => x.candidate.status === "declare")) {
      const publishers = new Set((p.candidate.sources ?? []).map((s) => s.publisher));
      expect(publishers.size, p.id).toBeGreaterThanOrEqual(2);
    }
  });
  it("chaque soutien désigne une candidature existante", () => {
    for (const p of parties.filter((x) => x.candidate.status === "soutien")) {
      expect(p.candidate.supports?.name, p.id).toBeTruthy();
      const target = parties.find((x) => x.id === p.candidate.supports?.partyId);
      if (target) expect(target.candidate.name, p.id).toBe(p.candidate.supports?.name);
    }
  });
});
