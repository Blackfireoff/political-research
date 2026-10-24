import path from "node:path";

/** Répertoire persistant (volume Docker) : PDF archivés et index des passages. */
// Chemin résolu à l'exécution : exclu de l'analyse de traçage des fichiers.
export const DATA_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "storage"),
);
export const DOCS_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "documents");
export const MANIFEST_PATH = path.join(/*turbopackIgnore: true*/ DATA_DIR, "manifest.json");
export const CHUNKS_PATH = path.join(/*turbopackIgnore: true*/ DATA_DIR, "chunks.json");
