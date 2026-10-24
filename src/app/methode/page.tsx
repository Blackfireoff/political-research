import type { Metadata } from "next";
import { ReliabilityMeter } from "@/components/source-badge";
import { partiesFile, sourceCategories, sourcesMethodology } from "@/lib/data";
import sourcesJson from "../../../data/sources.json";
import feedsJson from "../../../data/feeds.json";
import type { SourceCategory } from "@/lib/types";

export const metadata: Metadata = { title: "Méthode et sources, Recoupe" };

export default function MethodePage() {
  const categories = Object.entries(sourceCategories) as [SourceCategory, (typeof sourceCategories)[SourceCategory]][];
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-10">
      <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Méthode et sources</h1>

      <section className="mt-8 max-w-prose space-y-3">
        <h2 className="text-lg font-semibold">Comment une réponse est produite</h2>
        <p>
          Pour chaque question, l&apos;outil rassemble quatre types de sources, toutes numérotées : les fiches de
          données vérifiées sur les partis, les passages pertinents des programmes officiels archivés, les articles
          récents des flux RSS de la presse, et les pages trouvées par une recherche web (SearXNG). Les sources classées
          « fiabilité faible » (réseaux sociaux) sont écartées et listées comme telles.
        </p>
        <p>
          Le modèle de langage (MiniMax) reçoit la consigne de ne rien affirmer qui ne figure pas dans ces sources, de
          citer chaque affirmation, de préciser l&apos;année des documents et de rester neutre. L&apos;interface vérifie
          que chaque citation correspond à une source existante et signale les citations invalides. Un modèle de langage
          peut malgré tout mal interpréter un passage : les citations surlignées servent à le vérifier.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Fiabilité et orientation des sources</h2>
        <p className="mt-2 max-w-prose text-sm text-graphite">{sourcesMethodology}</p>
        <div className="-mx-4 mt-4 overflow-x-auto px-4">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-graphite">
                <th className="py-2 pr-4 font-medium">Catégorie</th>
                <th className="py-2 pr-4 font-medium">Fiabilité</th>
                <th className="py-2 font-medium">Signification</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(([key, c]) => (
                <tr key={key} className="border-b border-rule align-top">
                  <td className="py-2 pr-4 font-medium">{c.label}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <ReliabilityMeter reliability={c.reliability} />
                  </td>
                  <td className="py-2 text-graphite">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium">
            Catalogue des médias et domaines ({sourcesJson.sources.length})
          </summary>
          <div className="-mx-4 mt-3 overflow-x-auto px-4">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-rule text-graphite">
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Catégorie</th>
                  <th className="py-2 pr-4 font-medium">Orientation documentée</th>
                  <th className="py-2 font-medium">Propriétaire</th>
                </tr>
              </thead>
              <tbody>
                {sourcesJson.sources.map((s) => (
                  <tr key={s.domain} className="border-b border-rule align-top">
                    <td className="py-1.5 pr-4">
                      {s.name} <span className="text-xs text-graphite">{s.domain}</span>
                    </td>
                    <td className="py-1.5 pr-4">{sourceCategories[s.category as SourceCategory].label}</td>
                    <td className="py-1.5 pr-4">
                      {s.orientation ? (
                        "ref" in s && s.ref ? (
                          <a
                            href={s.ref}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-rule underline-offset-2"
                          >
                            {s.orientation}
                          </a>
                        ) : (
                          s.orientation
                        )
                      ) : (
                        <span className="text-graphite">Non documentée</span>
                      )}
                    </td>
                    <td className="py-1.5 text-graphite">{"owner" in s ? s.owner : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className="text-lg font-semibold">Données sur les partis et candidatures</h2>
        <p className="mt-2 text-sm">{partiesFile.methodology}</p>
        <h3 className="mt-4 text-sm font-semibold">Sources consultées</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {partiesFile.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {s.title}
              </a>{" "}
              <span className="text-graphite">{s.date ? `(${s.date})` : ""}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 text-sm font-semibold">Points non tranchés entre les sources</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-graphite">
          {partiesFile.openIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 max-w-prose">
        <h2 className="text-lg font-semibold">Flux d&apos;actualité</h2>
        <p className="mt-2 text-sm">{feedsJson.note}</p>
        <ul className="mt-2 columns-2 text-sm text-graphite">
          {feedsJson.feeds.map((f) => (
            <li key={f.id}>{f.domain}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
