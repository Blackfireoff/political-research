import { readFile } from "node:fs/promises";
import path from "node:path";
import { importDocument, readManifest } from "@/lib/ingest";
import { DOCS_DIR } from "@/lib/storage";

/** Sert la copie archivée d'un document officiel (PDF ou texte extrait d'une page HTML). */
export async function GET(_request: Request, ctx: RouteContext<"/api/documents/[docId]">) {
  const { docId } = await ctx.params;
  const entry = (await readManifest()).find((m) => m.docId === docId);
  if (!entry) return Response.json({ error: "Document non archivé." }, { status: 404 });

  const file = await readFile(path.join(DOCS_DIR, path.basename(entry.file)));
  const isPdf = entry.file.endsWith(".pdf");
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="${entry.docId}.${isPdf ? "pdf" : "txt"}"`,
      "Cache-Control": "public, max-age=3600",
      "X-Source-Url": entry.url,
      "X-Sha256": entry.sha256,
    },
  });
}

/**
 * Import manuel d'une copie (site protégé contre les robots). Protégé par ADMIN_TOKEN.
 * Corps : le fichier brut, ou un formulaire multipart avec un champ « file ».
 */
export async function POST(request: Request, ctx: RouteContext<"/api/documents/[docId]">) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`)
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  const { docId } = await ctx.params;
  let buffer: Buffer;
  if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    const file = (await request.formData()).get("file");
    if (!(file instanceof Blob)) return Response.json({ error: "Champ « file » manquant." }, { status: 400 });
    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    buffer = Buffer.from(await request.arrayBuffer());
  }
  try {
    const entry = await importDocument(docId, buffer);
    return Response.json(entry, { status: 201 });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
