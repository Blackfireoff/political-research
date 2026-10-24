export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { indexExists, runIngest } = await import("./lib/ingest");
  // Premier démarrage : archive les programmes en tâche de fond (le site reste utilisable).
  if (!indexExists() || process.env.INGEST_ON_START === "always") {
    console.log("[ingest] archivage des programmes officiels en cours…");
    void runIngest();
  }
}
