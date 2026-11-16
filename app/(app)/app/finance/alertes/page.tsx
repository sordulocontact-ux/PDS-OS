import { AlertsList } from "@/components/finance/alerts-list";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { FormMessage } from "@/components/auth/form-message";
import { EmptyNote } from "@/components/shell/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { requirePermission } from "@/lib/auth/dal";
import { severityOf, type AlertSeverity } from "@/lib/finance/alerts";
import { loadFinanceWatch } from "@/lib/finance/watch-queries";
import { financeAlerts as t } from "@/lib/i18n/fr/finance-alerts";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const GROUPS: AlertSeverity[] = ["danger", "warning", "info"];

/**
 * Finance › Alertes (Ibé's ticket, « Alertes utiles », lot 7): every alert,
 * the most serious first, each opening the page where it is acted on. The
 * overview's « À surveiller » shows the first ones.
 */
export default async function FinanceAlertsPage() {
  const today = parisPlace(new Date()).day;
  const [, watch] = await allInOrder([
    requirePermission("read_finance"),
    loadFinanceWatch(today),
  ]);
  const { alerts } = watch;

  return (
    <FinanceFrame section="alerts">
      {watch.error && (
        <FormMessage kind="error">{treasuryText.loadError}</FormMessage>
      )}
      {alerts.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        GROUPS.map((severity) => {
          const group = alerts.filter((a) => severityOf(a) === severity);
          return group.length === 0 ? null : (
            <MetricCard
              key={severity}
              title={t.groups[severity]}
              count={group.length}
            >
              <AlertsList alerts={group} />
            </MetricCard>
          );
        })
      )}
    </FinanceFrame>
  );
}
