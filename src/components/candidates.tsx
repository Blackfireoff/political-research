import Link from "next/link";
import { parties, partiesFile } from "@/lib/data";
import { STATUS_DESCRIPTIONS, STATUS_LABELS } from "@/lib/labels";
import type { Party } from "@/lib/types";

/** Nom de famille approximatif (« Marine Le Pen » donne « Le Pen ») pour l'ordre alphabétique. */
function surname(name: string): string {
  return name.split(" ").slice(1).join(" ") || name;
}

function candidateName(p: Party): string | null {
  return p.candidate.status === "soutien" ? (p.candidate.supports?.name ?? null) : p.candidate.name;
}

const STATUS_TONE: Partial<Record<Party["candidate"]["status"], string>> = {
  incertain: "text-warn",
  pressenti: "text-warn",
};

/**
 * Candidatures regroupées par personne, ordre alphabétique : le parti qui porte la candidature,
 * puis les partis qui la soutiennent sans candidat propre.
 */
export function Candidates() {
  const groups = new Map<string, Party[]>();
  for (const p of parties) {
    const name = candidateName(p);
    if (!name) continue;
    groups.set(name, [...(groups.get(name) ?? []), p]);
  }
  const rows = [...groups.entries()]
    .sort(([a], [b]) => surname(a).localeCompare(surname(b), "fr"))
    .map(([name, ps]) => {
      const own = ps.filter((p) => p.candidate.status !== "soutien");
      const supporters = ps.filter((p) => p.candidate.status === "soutien");
      return { name, own, supporters, main: own[0] ?? ps[0] };
    });
  const without = parties.filter((p) => !candidateName(p));

  return (
    <section aria-labelledby="candidates-title">
      <h2 id="candidates-title" className="font-serif text-2xl font-semibold max-lg:sr-only">
        Candidatures
      </h2>
      <p className="text-sm text-graphite lg:mt-1">
        État au {new Date(partiesFile.generatedOn).toLocaleDateString("fr-FR")}. La liste officielle ne sera connue
        qu&apos;après validation des parrainages par le Conseil constitutionnel.
      </p>
      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {rows.map(({ name, own, supporters, main }) => (
          <li key={name} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{name}</span>
              <a
                href={main.candidate.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={`shrink-0 text-xs underline decoration-rule underline-offset-2 ${STATUS_TONE[main.candidate.status] ?? "text-graphite"}`}
                title={`${STATUS_DESCRIPTIONS[main.candidate.status]} (source du ${main.candidate.sourceDate})`}
              >
                {STATUS_LABELS[main.candidate.status]}
              </a>
            </div>
            <p className="text-sm text-graphite">
              <PartyLinks parties={own} />
              {supporters.length > 0 && (
                <>
                  {own.length > 0 && <br />}
                  Soutenu par <PartyLinks parties={supporters} />
                </>
              )}
            </p>
            {main.candidate.note && (
              <details className="mt-1 text-xs text-graphite">
                <summary className="cursor-pointer py-1">Précisions et sources</summary>
                <p className="mt-1 leading-relaxed">{main.candidate.note}</p>
                {main.candidate.sources && main.candidate.sources.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {main.candidate.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                          {s.publisher}
                          {s.date ? `, ${s.date}` : ""}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            )}
          </li>
        ))}
      </ul>
      {without.length > 0 && (
        <p className="mt-3 text-xs text-graphite">Sans candidat connu : {without.map((p) => p.name).join(", ")}.</p>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer py-1">
          Autres candidatures déclarées ({partiesFile.otherDeclaredCandidates.candidates.length})
        </summary>
        <ul className="mt-2 space-y-1 text-sm text-graphite">
          {partiesFile.otherDeclaredCandidates.candidates.map((c) => (
            <li key={c.name}>
              {c.name} <span className="text-xs">({c.label})</span>
            </li>
          ))}
        </ul>
        <a
          href={partiesFile.otherDeclaredCandidates.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs underline underline-offset-2"
        >
          Source : franceinfo, {partiesFile.otherDeclaredCandidates.sourceDate}
        </a>
      </details>
    </section>
  );
}

function PartyLinks({ parties: ps }: { parties: Party[] }) {
  return ps.map((p, i) => (
    <span key={p.id}>
      {i > 0 && ", "}
      <Link href={`/programmes/${p.id}`} className="hover:underline">
        {p.name}
      </Link>
    </span>
  ));
}
