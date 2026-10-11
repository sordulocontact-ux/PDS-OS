import { FactList } from "@/components/ui/fact-list";
import type { ActivationSummary } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";

const t = fr.activations.header;

/**
 * The Marketing's state at a glance (ticket : « L'en-tête affiche le projet,
 * la période, le responsable Marketing, le nombre d'activations, les alertes
 * et l'état du volet Marketing ») — never « terminé » before the Marketing's
 * closure is validated (the Suivi & bilan stage).
 */
export function ActivationsHeader({
  rows,
  ownerName,
  marketingClosed,
}: {
  rows: ActivationSummary[];
  ownerName: string | null;
  marketingClosed: boolean;
}) {
  const starts = rows.flatMap((a) => (a.startsOn ? [a.startsOn] : [])).sort();
  const dues = rows.flatMap((a) => (a.dueOn ? [a.dueOn] : [])).sort();
  const from = starts[0] ?? dues[0];
  const to = dues.at(-1) ?? starts.at(-1);
  const alerts = rows.reduce((n, a) => n + a.alerts.length, 0);
  return (
    <FactList
      className="sm:flex-row sm:flex-wrap sm:gap-x-10"
      facts={[
        {
          label: t.period,
          value:
            from && to ? t.periodValue(formatDate(from), formatDate(to)) : null,
        },
        { label: t.owner, value: ownerName },
        { label: t.count, value: String(rows.length) },
        { label: t.alerts, value: String(alerts) },
        {
          label: t.marketing,
          value: marketingClosed ? t.marketingClosed : t.marketingOpen,
        },
      ]}
      emptyLabel={fr.activations.notProvided}
    />
  );
}
