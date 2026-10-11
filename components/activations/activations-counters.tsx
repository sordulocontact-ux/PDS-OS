import { StatTiles } from "@/components/ui/stat-tiles";
import type { ActivationSummary } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.activations.counters;

/**
 * The key figures, each with its rule of calculation (ticket : « Les
 * compteurs affichent leur règle de calcul et excluent clairement les
 * éléments hors périmètre ») : a declared proof is never counted as a
 * verified one, a missing statistic never as a zero.
 */
export function ActivationsCounters({ rows }: { rows: ActivationSummary[] }) {
  const live = rows.filter((a) => a.status !== "cancelled");
  const withProof = live.filter((a) => a.proof !== "not_expected");
  const withMetrics = live.filter((a) => a.measure !== "not_expected");
  const count = <T,>(list: T[], keep: (x: T) => boolean) =>
    list.filter(keep).length;
  const open = count(
    rows,
    (a) => a.status !== "closed" && a.status !== "cancelled",
  );
  const blocked = count(rows, (a) => a.blocked);
  const proofVerified = count(withProof, (a) => a.proof === "verified");
  const proofDeclared = count(withProof, (a) =>
    ["provided_unverified", "contested", "unavailable"].includes(a.proof),
  );
  const proofMissing = count(withProof, (a) => a.proof === "to_provide");
  const metricsVerified = count(
    withMetrics,
    (a) => a.measure === "available_verified",
  );
  const metricsDeclared = count(withMetrics, (a) =>
    ["available_declared", "partial"].includes(a.measure),
  );
  const metricsMissing = count(withMetrics, (a) => a.measure === "to_collect");

  return (
    <div className="flex flex-col gap-2">
      <StatTiles
        stats={[
          { label: t.open, value: String(open) },
          { label: t.blocked, value: String(blocked) },
          {
            label: t.publications(proofDeclared, proofMissing),
            value: String(proofVerified),
          },
          {
            label: t.metricsLabel(metricsDeclared, metricsMissing),
            value: String(metricsVerified),
          },
        ]}
      />
      <details className="text-sm text-muted-foreground">
        <summary className="w-fit cursor-pointer rounded-md py-1 underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          {t.rule}
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>
            <span className="font-medium text-foreground">{t.open}</span> :{" "}
            {t.openRule}
          </li>
          <li>
            <span className="font-medium text-foreground">{t.blocked}</span> :{" "}
            {t.blockedRule}
          </li>
          <li>{t.publicationsRule}</li>
          <li>{t.metricsRule}</li>
        </ul>
      </details>
    </div>
  );
}
