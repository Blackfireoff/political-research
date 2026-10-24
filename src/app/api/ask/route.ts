import { buildContext, systemPrompt, userPrompt } from "@/lib/context";
import { proofread, streamCompletion } from "@/lib/llm";
import { acceptProofread, extractCitations, stripCjk } from "@/lib/text";
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
        for await (const chunk of streamCompletion(
          [
            { role: "system", content: systemPrompt(today) },
            { role: "user", content: userPrompt(question, ctx) },
          ],
          request.signal,
        )) {
          const text = stripCjk(chunk);
          answer += text;
          if (text) send({ type: "delta", text });
        }

        // Le modèle glisse parfois des mots parasites : relecture de forme, rejetée si le fond change.
        if (answer && process.env.MINIMAX_PROOFREAD !== "false") {
          send({ type: "status", message: "Relecture…" });
          try {
            const revised = stripCjk(await proofread(answer));
            if (revised !== answer && acceptProofread(answer, revised)) {
              answer = revised;
              send({ type: "replace", text: revised });
            }
          } catch (err) {
            console.warn("[ask] relecture impossible", err instanceof Error ? err.message : err);
          }
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
