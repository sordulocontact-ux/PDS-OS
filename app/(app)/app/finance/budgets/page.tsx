import { IconChartBarTrendUp } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { NewCostCenterButton } from "@/components/finance/budget-actions";
import { EnvelopesTable } from "@/components/finance/envelopes-table";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { MonthChart } from "@/components/finance/month-chart";
import { PostPie } from "@/components/finance/post-pie";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudgets } from "@/lib/finance/budget-queries";
import {
  byPost,
  envelopeRow,
  linesOf,
  spendMonthBars,
  totalsOf,
  type EnvelopeKind,
} from "@/lib/finance/envelopes";
import { chartMonths } from "@/lib/finance/period";
import { financeBudgets as t } from "@/lib/i18n/fr/finance-budgets";
import { parisPlace } from "@/lib/utils/calendar-period";
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
 * Finance › Budgets (Ibé's ticket, maquette 2, lot 4): the live envelopes
 * (projects, artists, cost centers) with « budget initial, révisions,
 * prévu, engagé, facturé, payé, reste, refacturable, écart au
 * prévisionnel », the split by poste and the months; every figure, the pie
 * and the chart computed from the same envelopes (« cohérents avec les
 * filtres actifs »). Each envelope opens its detail.
 */
export default async function FinanceBudgetsPage({
  searchParams,
}: PageProps<"/app/finance/budgets">) {
  const today = parisPlace(new Date()).day;
  const [access, params, data] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadBudgets(),
  ]);
  const type = asType(params.type);
  const kind = TYPES[type];
  const rows = data.envelopes
    .filter((e) => !e.archived && (!kind || e.kind === kind))
    .map((e) => envelopeRow(e, data.spends))
    .filter((r) => r.currentCents !== null || r.totals.lines > 0)
    .sort((a, b) => b.engagedCents - a.engagedCents);
  const lines = data.envelopes
    .filter((e) => rows.some((r) => r.kind === e.kind && r.id === e.id))
    .flatMap((e) => linesOf(e, data.spends));
  const totals = totalsOf(lines);
  const sum = (pick: (r: (typeof rows)[number]) => number) =>
    rows.reduce((s, r) => s + pick(r), 0);
  const envelopes = sum((r) => r.currentCents ?? 0);
  const revisions = sum((r) => r.revisionsCents);
  const engaged = sum((r) => r.engagedCents);
  const rest = sum((r) => r.restCents ?? 0);
  const gap = totals.projectedCents - totals.forecastCents;
  const months = chartMonths(
    { key: "tout", from: null, to: null, previous: null },
    today,
    lines.map((s) => s.spentOn.slice(0, 7)),
  );

  return (
    <FinanceFrame
      section="budgets"
      action={
        can(access, "manage_finance") ? (
          <NewCostCenterButton templates={data.templates} />
        ) : undefined
      }
    >
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {data.envelopes.length === 0 && !data.error ? (
        <EmptyState
          icon={IconChartBarTrendUp}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          <SegmentedLinks
            label={t.kinds.label}
            options={(Object.keys(TYPES) as TypeKey[]).map((key) => ({
              key,
              href: `${routes.financeBudgets}?type=${key}`,
              label: TYPE_LABEL[key],
              current: type === key,
            }))}
          />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              title={t.tiles.envelopes}
              value={amount(envelopes)}
              caption={t.tiles.envelopesHint(
                rows.length,
                revisions
                  ? t.signed(amount(Math.abs(revisions)), revisions > 0)
                  : null,
              )}
            />
            <MetricCard
              title={t.tiles.engaged}
              value={amount(engaged)}
              caption={t.tiles.engagedHint(
                amount(totals.invoicedCents),
                amount(totals.paidCents),
              )}
            />
            <MetricCard
              title={t.tiles.rest}
              value={amount(rest)}
              caption={t.tiles.restHint(amount(totals.plannedCents))}
              danger={rest < 0}
            />
            <MetricCard
              title={t.tiles.gap}
              value={t.signed(amount(Math.abs(gap)), gap >= 0)}
              caption={t.tiles.gapHint(amount(totals.forecastCents))}
            />
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_2fr]">
            <PostPie posts={byPost(lines)} />
            <MonthChart bars={spendMonthBars(lines, months)} highlight={null} />
          </div>
          {rows.length === 0 ? (
            <EmptyNote>{t.emptyView}</EmptyNote>
          ) : (
            <EnvelopesTable rows={rows} />
          )}
        </>
      )}
    </FinanceFrame>
  );
}
