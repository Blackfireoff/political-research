import { describe, expect, it } from "vitest";
import { parseSuggestions } from "./suggestions";

describe("parseSuggestions", () => {
  it("extrait le tableau JSON même entouré de texte", () => {
    expect(parseSuggestions('Voici :\n["Que proposent les partis sur l\'école ?", "Qui est candidat ?"]')).toEqual([
      "Que proposent les partis sur l'école ?",
      "Qui est candidat ?",
    ]);
  });
  it("limite à trois questions et écarte les entrées invalides", () => {
    const raw = JSON.stringify([
      "Question une valide ?",
      "Pas une question",
      42,
      "Question deux valide ?",
      "x".repeat(90) + " ?",
      "Question trois valide ?",
      "Question quatre valide ?",
    ]);
    expect(parseSuggestions(raw)).toEqual(["Question une valide ?", "Question deux valide ?", "Question trois valide ?"]);
  });
  it("renvoie une liste vide si la réponse n'est pas exploitable", () => {
    expect(parseSuggestions("désolé")).toEqual([]);
    expect(parseSuggestions("[mal formé")).toEqual([]);
  });
});
