import type { CandidateStatus, ProgrammeKind } from "./types";

export const KIND_LABELS: Record<ProgrammeKind, string> = {
  "presidentielle-2027": "présidentielle 2027",
  "presidentielle-2022": "présidentielle 2022",
  "legislatives-2024": "législatives 2024",
  "europeennes-2024": "européennes 2024",
  autre: "autre document",
};

/** Libellés courts du statut d'une candidature (interface). */
export const STATUS_LABELS: Record<CandidateStatus, string> = {
  declare: "Déclaré",
  incertain: "Incertain",
  pressenti: "Pressenti",
  soutien: "Soutien",
  "primaire-en-cours": "Primaire en cours",
  inconnu: "Aucun candidat connu",
};

export const STATUS_DESCRIPTIONS: Record<CandidateStatus, string> = {
  declare: "candidature déclarée, confirmée par au moins deux sources",
  incertain: "statut incertain : les sources divergent",
  pressenti: "candidature seulement évoquée",
  soutien: "pas de candidat propre, soutient une autre candidature",
  "primaire-en-cours": "désignation en cours",
  inconnu: "pas de candidat connu",
};
