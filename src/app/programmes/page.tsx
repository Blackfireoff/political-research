import type { Metadata } from "next";
import Link from "next/link";
import { KIND_LABELS } from "@/lib/labels";
import { parties } from "@/lib/data";

export const metadata: Metadata = { title: "Programmes officiels, Recoupe" };

export default function ProgrammesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Programmes officiels</h1>
      <p className="mt-2 max-w-prose text-graphite">
        Documents publiés par les partis eux-mêmes, archivés à l&apos;identique avec leur empreinte SHA-256. Quand aucun
        programme pour 2027 n&apos;est encore publié, le document le plus récent est indiqué avec son année : il ne
        préjuge pas du programme à venir.
      </p>
      <ul className="mt-8 divide-y divide-rule border-y border-rule">
        {parties.map((p) => {
          const has2027 = p.programmes.some((d) => d.kind === "presidentielle-2027" && d.verified);
          return (
            <li key={p.id} className="grid gap-2 py-4 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-8 sm:py-5">
              <div>
                <Link href={`/programmes/${p.id}`} className="inline-flex min-h-9 items-center text-lg font-semibold hover:underline">
                  {p.name}
                </Link>
                <p className="text-sm text-graphite">
                  {p.shortName}
                  {p.candidate.status === "soutien" && p.candidate.supports
                    ? `, soutient ${p.candidate.supports.name}`
                    : p.candidate.name
                      ? `, candidat : ${p.candidate.name}`
                      : ""}
                </p>
              </div>
              <div>
                <p className="text-sm">
                  {has2027 ? (
                    <span className="font-medium text-ok">Programme 2027 publié</span>
                  ) : (
                    <span className="text-graphite">Pas de programme 2027 publié à ce jour</span>
                  )}
                </p>
                {p.programmes.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {p.programmes.map((d) => (
                      <li key={d.url} className="flex flex-wrap gap-x-2">
                        <span className="text-graphite">
                          {KIND_LABELS[d.kind]}
                          {d.year ? `, ${d.year}` : ""}
                        </span>
                        <span>{d.title}</span>
                        {!d.verified && <span className="text-bad">(lien non vérifié)</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-graphite">Aucun document recensé.</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
