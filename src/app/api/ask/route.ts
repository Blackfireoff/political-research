import { buildContext, systemPrompt, userPrompt } from "@/lib/context";
import { streamCompletion } from "@/lib/llm";
import { extractCitations } from "@/lib/text";
import type { AskEvent } from "@/lib/types";

export const maxDuration = 180;

const MAX_QUESTION_LENGTH = 600;

/** Pose une question : renvoie un flux NDJSON d'événements (sources, statut, texte, fin). */
export async function POST(request: Request) {
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {}
  if (!question) return Response.json({ error: "La question est vide." }, { status: 400 });
  if (question.length > MAX_QUESTION_LENGTH)
    return Response.json({ error: `La question dépasse ${MAX_QUESTION_LENGTH} caractères.` }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AskEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const ctx = await buildContext(question, (message) => send({ type: "status", message }));
        send({ type: "sources", sources: ctx.sources, excluded: ctx.excluded });
        send({ type: "status", message: "Rédaction de la réponse…" });

        const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
        let answer = "";
        for await (const text of streamCompletion(
          [
            { role: "system", content: systemPrompt(today) },
            { role: "user", content: userPrompt(question, ctx) },
          ],
          request.signal,
        )) {
          answer += text;
          send({ type: "delta", text });
        }
        const valid = new Set(ctx.sources.map((s) => s.n));
        send({ type: "done", invalidCitations: extractCitations(answer).filter((n) => !valid.has(n)) });
      } catch (err) {
        if (!request.signal.aborted) {
          console.error("[ask]", err);
          send({ type: "error", message: err instanceof Error ? err.message : "Erreur inconnue." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
