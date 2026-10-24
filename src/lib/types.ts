export type CandidateStatus =
  | "declare"
  | "incertain"
  | "pressenti"
  | "soutien"
  | "primaire-en-cours"
  | "inconnu";

export interface SourceRef {
  url: string;
  publisher: string;
  date: string | null;
  quote?: string;
}

export type ProgrammeKind =
  | "presidentielle-2027"
  | "presidentielle-2022"
  | "legislatives-2024"
  | "europeennes-2024"
  | "autre";

export interface Programme {
  title: string;
  year: number | null;
  kind: ProgrammeKind;
  url: string;
  format: "pdf" | "html";
  verified: boolean;
  verifiedOn: string;
  note?: string;
}

export interface Party {
  id: string;
  name: string;
  shortName: string;
  officialWebsite: string;
  officialWebsiteCheck?: string;
  leader?: { name: string; role?: string; sourceUrl: string; note?: string };
  candidate: {
    name: string | null;
    status: CandidateStatus;
    /** Pour « soutien » : la candidature soutenue, portée par un autre parti. */
    supports?: { name: string; partyId: string | null } | null;
    sourceUrl: string;
    sourceDate: string;
    /** Sources concordantes ayant servi à établir le statut. */
    sources?: SourceRef[];
    note?: string;
  };
  programmes: Programme[];
  programmeStatus2027?: string;
  orientation?: { label: string; sourceUrl: string; note?: string } | null;
}

export interface PartiesFile {
  generatedOn: string;
  methodology: string;
  election: {
    firstRound: string;
    secondRound: string;
    sponsorshipDeadline?: string;
    sourceUrl: string;
    note?: string;
  };
  parties: Party[];
  otherDeclaredCandidates: {
    note: string;
    sourceUrl: string;
    sourceDate: string;
    candidates: { name: string; label: string; note?: string; sourceUrl?: string }[];
    withdrawn?: { name: string; label?: string; note?: string; sourceUrl?: string }[];
  };
  sources: { title: string; url: string; date: string | null; accessed: string; note?: string }[];
  openIssues: string[];
}

/** Catégorie d'une source, qui détermine son niveau de fiabilité. */
export type SourceCategory =
  | "institution"
  | "agence"
  | "service-public"
  | "verification"
  | "presse"
  | "opinion"
  | "partisan"
  | "encyclopedie"
  | "reseau-social"
  | "inconnu";

export type Reliability = "officielle" | "elevee" | "a-recouper" | "faible" | "non-evaluee";

export interface SourceProfile {
  domain: string;
  name: string;
  category: SourceCategory;
  reliability: Reliability;
  /** Orientation éditoriale documentée, ou null si non documentée / sans objet. */
  orientation: string | null;
  owner?: string;
  note?: string;
  ref?: string;
}

/** Document du programme découpé en passages indexés. */
export interface DocChunk {
  id: string;
  docId: string;
  partyIds: string[];
  title: string;
  url: string;
  year: number | null;
  kind: ProgrammeKind;
  page: number;
  text: string;
}

export interface DocManifestEntry {
  docId: string;
  url: string;
  title: string;
  year: number | null;
  kind: ProgrammeKind;
  partyIds: string[];
  file: string;
  sha256: string;
  bytes: number;
  pages: number;
  downloadedAt: string;
  /** Téléchargé automatiquement, ou déposé à la main (site protégé contre les robots). */
  origin?: "telechargement" | "import-manuel";
}

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
  feedId: string;
  source: SourceProfile;
  partyIds: string[];
}

/** Une source fournie au modèle, numérotée [n] dans la réponse. */
export interface ContextSource {
  n: number;
  type: "programme" | "fiche" | "actualite" | "web";
  title: string;
  url: string;
  excerpt: string;
  source: SourceProfile;
  page?: number;
  docId?: string;
  partyIds?: string[];
  date?: string | null;
}

export type AskEvent =
  | { type: "sources"; sources: ContextSource[]; excluded: { url: string; title: string; reason: string }[] }
  | { type: "status"; message: string }
  | { type: "delta"; text: string }
  | { type: "done"; invalidCitations: number[] }
  | { type: "error"; message: string };
