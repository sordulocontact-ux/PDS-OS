import { IconDownload } from "@/components/icons";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { buttonVariants } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { Timestamp } from "@/components/ui/timestamp";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { EXPORT_TYPES } from "@/lib/finance/exports";
import { loadHistory } from "@/lib/finance/history";
import { financeExports as t } from "@/lib/i18n/fr/finance-exports";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

/**
 * Finance › Exports (Ibé's ticket, « export comptable » and « historique »,
 * lot 7): one CSV per subject for the accountant, and the last changes of
 * every Finance datum (who, when, what, which fields), kept by trigger.
 */
export default async function FinanceExportsPage() {
  const [, history] = await allInOrder([
    requirePermission("read_finance"),
    loadHistory(),
  ]);

  return (
    <FinanceFrame section="exports">
      <p className="text-body-md text-[color:var(--text-secondary)]">
        {t.description}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXPORT_TYPES.map((type) => (
          <MetricCard
            key={type}
            title={t.files[type].title}
            action={
              <a
                href={routes.financeExport(type)}
                download
                className={buttonVariants({ variant: "outline", size: "xs" })}
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
      <MetricCard
        title={t.history.title}
        caption={t.history.caption}
        count={history.length}
      >
        {history.length === 0 ? (
          <p className="text-body-md text-[color:var(--text-secondary)]">
            {t.history.empty}
          </p>
        ) : (
          <ul className="-my-2 divide-y divide-[var(--border-hairline)]">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-start justify-between gap-3 py-2"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-body-md font-medium">
                    {t.history.line(
                      h.who ?? t.history.someone,
                      h.entity,
                      h.action,
                      h.name,
                    )}
                  </span>
                  {h.fields.length > 0 && (
                    <span className="text-caption text-[color:var(--text-secondary)]">
                      {h.fields.join(", ")}
                    </span>
                  )}
                </span>
                <Timestamp
                  iso={h.at}
                  className="shrink-0 text-caption text-[color:var(--text-secondary)]"
                />
              </li>
            ))}
          </ul>
        )}
      </MetricCard>
    </FinanceFrame>
  );
}
