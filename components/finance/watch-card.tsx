import { AlertsList } from "@/components/finance/alerts-list";
import { MetricCard, MetricCardLink } from "@/components/ui/metric-card";
import { routes } from "@/lib/auth/redirects";
import type { Alert } from "@/lib/finance/alerts";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";

const fr = { treasury: treasuryText };

/**
 * « À surveiller » (ticket, « Alertes utiles »): the first alerts of the
 * Alertes page, the same ones and the same count as the bell (one list,
 * `financeAlerts`), each opening the page where it is acted on. The count
 * is the whole of them, « Tout voir » opens the page.
 */
export function WatchCard({
  alerts,
  total,
}: {
  alerts: Alert[];
  total: number;
}) {
  const w = fr.treasury.overview.watch;
  return (
    <MetricCard
      title={w.title}
      count={total}
      action={
        <MetricCardLink href={routes.financeAlerts}>{w.all}</MetricCardLink>
      }
    >
      {alerts.length === 0 ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {w.empty}
        </p>
      ) : (
        <AlertsList alerts={alerts} />
      )}
    </MetricCard>
  );
}
