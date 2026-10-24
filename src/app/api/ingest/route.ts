import { connection } from "next/server";
import { ingestStatus, runIngest } from "@/lib/ingest";

/** État de l'archivage des programmes. */
export async function GET() {
  await connection();
  return Response.json(ingestStatus());
}

/** Relance l'archivage. Protégé par ADMIN_TOKEN (en-tête Authorization: Bearer …). */
export async function POST(request: Request) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`)
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  const force = new URL(request.url).searchParams.get("force") === "1";
  void runIngest({ force });
  return Response.json({ started: true, force }, { status: 202 });
}
