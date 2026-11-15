import { IconChartBarTrendUp } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import {
  NewCostCenterButton,
  NewFromTemplateButton,
} from "@/components/finance/budget-actions";
import { EnvelopesTable } from "@/components/finance/envelopes-table";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { envelopeRow, type EnvelopeKind } from "@/lib/finance/envelopes";
import { financeBudgets as t } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const amount = (cents: number) => formatAmount(cents, { ht: false });

const TYPES = {
  tous: null,
  projets: "project",
  artistes: "artist",
  centres: "cost_center",
} as const satisfies Record<string, EnvelopeKind | null>;
type TypeKey = keyof typeof TYPES;
const asType = (value: unknown): TypeKey =>
  (Object.keys(TYPES) as TypeKey[]).find((k) => k === value) ?? "tous";
const TYPE_LABEL: Record<TypeKey, string> = {
  tous: t.kinds.all,
  projets: t.kinds.project,
  artistes: t.kinds.artist,
  centres: t.kinds.cost_center,
};

/**
 * Finance › Budgets, laid out as the proto's list (Sacha 15/11/2026): the
 * count and the rule of the figures on the left, the type filter and the
 * Finance's actions on the same line, then one row per envelope (budget,
 * engaged + invoiced + paid, what is left, share consumed). Each envelope
 * opens its page, which has every figure of Ibé's ticket, the split by
 * poste and the months; the cost-center templates close the page.
 */
export default async function FinanceBudgetsPage({
  searchParams,
}: PageProps<"/app/finance/budgets">) {
  const [access, params, data] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadBudgets(),
  ]);
  const canManage = can(access, "manage_finance");
  const type = asType(params.type);
  const kind = TYPES[type];
  const rows = data.envelopes
    .filter((e) => !e.archived && (!kind || e.kind === kind))
    .map((e) => envelopeRow(e, data.spends))
    .filter((r) => r.currentCents !== null || r.totals.lines > 0)
    .sort((a, b) => b.engagedCents - a.engagedCents);
  const empty = data.envelopes.length === 0 && !data.error;
  const actions = canManage ? (
    <NewCostCenterButton templates={data.templates} />
  ) : undefined;

  return (
    <FinanceFrame section="budgets" action={empty ? actions : undefined}>
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {empty ? (
        <EmptyState
          icon={IconChartBarTrendUp}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <SegmentedLinks
              label={t.kinds.label}
              options={(Object.keys(TYPES) as TypeKey[]).map((key) => ({
                key,
                href: `${routes.financeBudgets}?type=${key}`,
                label: TYPE_LABEL[key],
                current: type === key,
              }))}
            />
            <p className="min-w-0 flex-1 truncate text-body-md text-[color:var(--text-secondary)]">
              {t.list.count(rows.length)} · {t.list.rule}
            </p>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
          {rows.length === 0 ? (
            <EmptyNote>{t.emptyView}</EmptyNote>
          ) : (
            <EnvelopesTable rows={rows} />
          )}
          {canManage && data.templates.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.templates.map((template) => (
                <MetricCard
                  key={template.id}
                  title={t.templates.title(template.name)}
                  value={amount(
                    template.lines.reduce((s, l) => s + l.cents, 0),
                  )}
                  caption={t.templates.lines(template.lines.length)}
                >
                  <div>
                    <NewFromTemplateButton
                      template={template}
                      templates={data.templates}
                    />
                  </div>
                </MetricCard>
              ))}
            </div>
          )}
        </>
      )}
    </FinanceFrame>
  );
}
