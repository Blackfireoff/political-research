import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DocViewer, type ViewerDoc } from "@/components/doc-viewer";
import { getParty, parties } from "@/lib/data";
import { STATUS_LABELS } from "@/lib/labels";
import { docIdFor, ingestStatus, readManifest } from "@/lib/ingest";

export function generateStaticParams() {
  return parties.map((p) => ({ partyId: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/programmes/[partyId]">): Promise<Metadata> {
  const { partyId } = await params;
  return { title: `${getParty(partyId)?.name ?? "Parti"}, programmes officiels, Recoupe` };
}

async function Archive({ partyId }: { partyId: string }) {
  await connection();
  const party = getParty(partyId)!;
  const manifest = await readManifest();
  const docs: ViewerDoc[] = party.programmes.map((d) => {
    const docId = docIdFor(d.url);
    const archived = manifest.find((m) => m.docId === docId);
    return {
      docId,
      title: d.title,
      url: d.url,
      kind: d.kind,
      year: d.year,
      format: d.format,
      verified: d.verified,
      note: d.note ?? null,
      archive: archived
        ? {
            sha256: archived.sha256,
            bytes: archived.bytes,
            pages: archived.pages,
            downloadedAt: archived.downloadedAt,
            origin: archived.origin ?? "telechargement",
          }
        : null,
    };
  });
  return <DocViewer partyId={partyId} docs={docs} ingestRunning={ingestStatus().running} />;
}

export default async function PartyPage({ params }: PageProps<"/programmes/[partyId]">) {
  const { partyId } = await params;
  const party = getParty(partyId);
  if (!party) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
      <Link href="/programmes" className="inline-flex min-h-9 items-center text-sm text-graphite hover:underline">
        Tous les programmes
      </Link>
      <h1 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">{party.name}</h1>
      <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-graphite">Site officiel</dt>
        <dd>
          <a href={party.officialWebsite} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {party.officialWebsite}
          </a>
        </dd>
        {party.leader && (
          <>
            <dt className="text-graphite">Direction</dt>
            <dd>
              {party.leader.name}
              {party.leader.role ? `, ${party.leader.role}` : ""}{" "}
              <a href={party.leader.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-graphite underline">
                source
              </a>
            </dd>
          </>
        )}
        <dt className="text-graphite">Candidature 2027</dt>
        <dd>
          {party.candidate.status === "soutien" && party.candidate.supports
            ? `Pas de candidat propre, soutient ${party.candidate.supports.name}`
            : (party.candidate.name ?? "Aucun candidat connu")}{" "}
          <span className="text-xs text-graphite">({STATUS_LABELS[party.candidate.status]})</span>{" "}
          <a href={party.candidate.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-graphite underline">
            source du {party.candidate.sourceDate}
          </a>
          {party.candidate.note && (
            <details className="mt-1 max-w-prose text-xs text-graphite">
              <summary className="cursor-pointer py-1">Précisions</summary>
              <p className="leading-relaxed">{party.candidate.note}</p>
            </details>
          )}
        </dd>
        {party.orientation && (
          <>
            <dt className="text-graphite">Positionnement</dt>
            <dd>
              {party.orientation.label}{" "}
              <a href={party.orientation.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-graphite underline">
                selon Wikipédia
              </a>
            </dd>
          </>
        )}
        {party.programmeStatus2027 && (
          <>
            <dt className="text-graphite">Programme 2027</dt>
            <dd className="max-w-prose">{party.programmeStatus2027}</dd>
          </>
        )}
      </dl>

      <Suspense fallback={<p className="mt-10 text-sm text-graphite">Chargement des documents archivés…</p>}>
        <Archive partyId={party.id} />
      </Suspense>
    </div>
  );
}
