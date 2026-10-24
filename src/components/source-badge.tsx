import type { Reliability, SourceProfile } from "@/lib/types";

export const RELIABILITY_LABELS: Record<Reliability, string> = {
  officielle: "Source officielle",
  elevee: "Fiabilité élevée",
  "a-recouper": "À recouper",
  "non-evaluee": "Non évaluée",
  faible: "Fiabilité faible",
};

const LEVEL: Record<Reliability, number> = { officielle: 4, elevee: 3, "a-recouper": 2, "non-evaluee": 0, faible: 1 };

/** Jauge à quatre crans : lisible sans dépendre de la couleur. */
export function ReliabilityMeter({ reliability }: { reliability: Reliability }) {
  const level = LEVEL[reliability];
  const tone =
    reliability === "faible" ? "text-bad" : reliability === "a-recouper" ? "text-warn" : reliability === "non-evaluee" ? "text-graphite" : "text-ok";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone}`}>
      <span aria-hidden className="inline-flex gap-[2px]">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-1.5 rounded-[1px] ${
              reliability === "non-evaluee" ? "border border-dashed border-current" : i <= level ? "bg-current" : "bg-rule"
            }`}
          />
        ))}
      </span>
      {RELIABILITY_LABELS[reliability]}
    </span>
  );
}

export function SourceMeta({ source }: { source: SourceProfile }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-graphite">
      <span className="font-medium text-ink">{source.name}</span>
      <ReliabilityMeter reliability={source.reliability} />
      {source.orientation &&
        (source.ref ? (
          <a href={source.ref} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-2" title="Orientation décrite par Wikipédia">
            Orientation : {source.orientation}
          </a>
        ) : (
          <span>Orientation : {source.orientation}</span>
        ))}
    </span>
  );
}
