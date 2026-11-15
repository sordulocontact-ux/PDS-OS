import { FormMessage } from "@/components/auth/form-message";
import { BudgetsCard } from "@/components/finance/budgets-card";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { PostPie } from "@/components/finance/post-pie";
import { TreasuryCalendar } from "@/components/finance/treasury-calendar";
import { TreasuryCard } from "@/components/finance/treasury-card";
import {
  ReserveButton,
  StatementButton,
} from "@/components/finance/treasury-forms";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { UrlFilters } from "@/components/ui/url-filters";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { byPost, envelopeRow, linesOf } from "@/lib/finance/envelopes";
import { spendStage } from "@/lib/finance/spends";
import {
  TREASURY_HORIZONS,
  addDays,
  asHorizon,
  computeTreasury,
} from "@/lib/finance/treasury";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { treasury as t } from "@/lib/i18n/fr/treasury";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.titles.treasury };

/**
 * Finance › Trésorerie (Ibé's ticket, maquette 6), laid out as the proto's
 * Rapports page (Sacha 15/11/2026: « la page Rapports est mieux designée »):
 * the horizon (?horizon=) and an envelope (?enveloppe=) on top; the balance,
 * the low point against the minimum reserve, money in and out by week and
 * the balance over them (Sacha's Figma); the spends by poste (of the
 * envelope chosen, what is committed, invoiced or paid) beside what the
 * live budgets still allow; then every move the forecast counts. The Finance updates the balance and the reserve here.
 */
export default async function FinanceTreasuryPage({
  searchParams,
}: PageProps<"/app/finance/tresorerie">) {
  const today = parisPlace(new Date()).day;
  const [access, params] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
  ]);
  const horizon = asHorizon(params.horizon);
  const [data, budgets] = await allInOrder([
    loadTreasury(addDays(today, horizon)),
    loadBudgets(),
  ]);
  const treasury = computeTreasury({ ...data, today, horizon });
  const canManage = can(access, "manage_finance");
  const names = new Map(data.targets.map((x) => [x.id, x.name] as const));
  const live = budgets.envelopes.filter((e) => !e.archived);
  const chosen = live.find((e) => e.id === params.enveloppe) ?? null;
  // The pie counts what is committed, invoiced or paid; the planned is not.
  const spent = (chosen ? [chosen] : live)
    .flatMap((e) => linesOf(e, budgets.spends))
    .filter((s) => !s.refused && spendStage(s.status) !== "planned");
  const rows = live
    .map((e) => envelopeRow(e, budgets.spends))
    .filter((r) => r.currentCents !== null)
    .sort((a, b) => b.engagedCents - a.engagedCents);
  const p = t.page;

  return (
    <FinanceFrame
      section="treasury"
      action={
        canManage && treasury ? (
          <div className="flex flex-wrap items-center gap-2">
            <ReserveButton reserveCents={treasury.reserveCents} />
            <StatementButton />
          </div>
        ) : undefined
      }
    >
      {(data.error || budgets.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedLinks
          label={p.horizon}
          options={TREASURY_HORIZONS.map((days) => ({
            key: String(days),
            href: `${routes.financeTreasury}?horizon=${days}${chosen ? `&enveloppe=${chosen.id}` : ""}`,
            label: p.horizonOption(days),
            current: days === horizon,
          }))}
        />
        <div className="w-full max-w-64">
          <UrlFilters
            path={routes.financeTreasury}
            params={{ horizon: String(horizon) }}
            inline={1}
            groups={[
              {
                key: "enveloppe",
                label: t.envelopeFilter.label,
                allLabel: t.envelopeFilter.all,
                options: live.map((e) => ({ value: e.id, label: e.name })),
                current: chosen?.id ?? null,
              },
            ]}
          />
        </div>
      </div>
      <TreasuryCard
        treasury={treasury}
        horizon={horizon}
        canManage={canManage}
        detailed
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PostPie posts={byPost(spent)} />
        <BudgetsCard
          availableCents={rows.reduce(
            (sum, r) => sum + Math.max(r.restCents ?? 0, 0),
            0,
          )}
          activeEnvelopes={rows.length}
          budgets={rows.slice(0, 5).map((r) => ({
            id: r.id,
            envelopeCents: r.currentCents,
            engagedCents: r.engagedCents,
            estimatedCents: r.totals.plannedCents,
            restCents: r.restCents,
          }))}
          names={new Map(rows.map((r) => [r.id, r.name] as const))}
        />
      </div>
      {treasury && <TreasuryCalendar treasury={treasury} names={names} />}
    </FinanceFrame>
  );
}
