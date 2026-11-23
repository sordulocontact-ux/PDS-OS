import { IconDownload } from "@/components/icons";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { buttonVariants } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { EXPORT_TYPES } from "@/lib/finance/exports";
import { financeExports as t } from "@/lib/i18n/fr/finance-exports";

export const metadata = { title: t.title };

/**
 * Finance › Exports (Ibé's ticket, « export comptable », lot 7): one CSV per
 * subject for the accountant.
 */
export default async function FinanceExportsPage() {
  await requirePermission("read_finance");

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
    </FinanceFrame>
  );
}
