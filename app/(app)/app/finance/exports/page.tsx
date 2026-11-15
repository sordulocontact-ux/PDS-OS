import { IconDownload } from "@/components/icons";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { HistoryList } from "@/components/finance/history-list";
import { buttonVariants } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { EXPORT_TYPES } from "@/lib/finance/exports";
import { loadHistory } from "@/lib/finance/history";
import { financeExports as t } from "@/lib/i18n/fr/finance-exports";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

/**
 * Finance › Exports (Ibé's ticket, « export comptable » and « historique »,
 * lot 7): one CSV per subject for the accountant, and the changes of
 * every Finance datum (who, when, what, which fields), kept by trigger, the
 * last 20 first and « Voir plus ».
 */
export default async function FinanceExportsPage() {
  const [, history] = await allInOrder([
    requirePermission("read_finance"),
    loadHistory(),
  ]);

  return (
    <FinanceFrame section="exports">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXPORT_TYPES.map((type) => (
          <MetricCard
            key={type}
            title={t.files[type].title}
            action={
              <a
                href={routes.financeExport(type)}
                download
                className={buttonVariants({
                  variant: "outline",
                  size: "default",
                })}
              >
                <IconDownload aria-hidden data-icon="inline-start" />
                {t.download}
              </a>
            }
          >
            <p className="text-body-md text-[color:var(--text-secondary)]">
              {t.files[type].body}
            </p>
          </MetricCard>
        ))}
      </div>
      <MetricCard title={t.history.title} count={history.total}>
        <HistoryList first={history.entries} total={history.total} />
      </MetricCard>
    </FinanceFrame>
  );
}
