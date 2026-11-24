import { FormMessage } from "@/components/auth/form-message";
import { BudgetsCard } from "@/components/finance/budgets-card";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { FlowBars } from "@/components/finance/flow-bars";
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
import {
  asBudgetRow,
  budgetsAvailable,
  liveBudgetRows,
} from "@/lib/finance/cockpit";
import { byPost, linesOf } from "@/lib/finance/envelopes";
import { monthFlows } from "@/lib/finance/flows";
import { spendStage } from "@/lib/finance/spends";
import {
  TREASURY_HORIZONS,
  addDays,
  asHorizon,
  computeTreasury,
} from "@/lib/finance/treasury";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { treasury as t } from "@/lib/i18n/fr/treasury";
import { filterParamOf, filterValues } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.titles.treasury };

/**
 * Finance › Trésorerie (Ibé's ticket, maquette 6), laid out as the proto's
 * Rapports page (Sacha 15/11/2026: « la page Rapports est mieux designée »):
 * the horizon (?horizon=) on top, the Finance's actions on its right (the
 * same row as the overview's); the balance, the low point against the
 * minimum reserve and the curve; money in and out by month beside the
 * spends by poste (of the budget chosen in that card, ?enveloppe=: what is
 * committed, invoiced or paid); what the live budgets still allow (the
 * overview's figure); then every move the forecast counts, each opening
 * its record in the side sheet. The Finance updates the balance and the
 * reserve here.
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
  // As much of the past as of the future (Sacha 24/11/2026).
  const treasury = computeTreasury({
    ...data,
    today,
    horizon,
    past: horizon,
  });
  const canManage = can(access, "manage_finance");
  const live = budgets.envelopes.filter((e) => !e.archived);
  // Several budgets chosen: the pie adds them up.
  const ids = filterValues(params.enveloppe);
  const chosen = live.filter((e) => ids.includes(e.id));
  const enveloppe = filterParamOf(chosen.map((e) => e.id));
  // The pie counts what is committed, invoiced or paid; the planned is not.
  const spent = (chosen.length > 0 ? chosen : live)
    .flatMap((e) => linesOf(e, budgets.spends))
    .filter((s) => !s.refused && spendStage(s.status) !== "planned");
  // The same budgets and the same figure as the overview's card.
  const rows = liveBudgetRows(budgets.envelopes, budgets.spends);
  const flows = monthFlows({
    receipts: data.receipts,
    paid: data.paid,
    treasury,
    today,
    // The months behind as many as the horizon's ahead.
    before: Math.max(3, Math.round(horizon / 30.4)),
  });
  const p = t.page;

  return (
    <FinanceFrame section="treasury">
      {(data.error || budgets.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      {/* The same row as the overview's: the horizon on the left, the
          Finance's actions on the right (the balance, the reserve). */}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedLinks
          label={p.horizon}
          options={TREASURY_HORIZONS.map((days) => ({
            key: String(days),
            href: viewHref(routes.financeTreasury, {
              horizon: String(days),
              enveloppe,
            }),
            label: p.horizonOption(days),
            current: days === horizon,
          }))}
        />
        {canManage && treasury && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ReserveButton reserveCents={treasury.reserveCents} />
            <StatementButton variant="default" />
          </div>
        )}
      </div>
      <TreasuryCard
        treasury={treasury}
        horizon={horizon}
        canManage={canManage}
        detailed
      />
      {/* As the proto's Rapports page (Sacha 15/11/2026: its « Entrées et
          sorties » chart is the most readable): money in and out by month
          beside the spends by poste, then the budgets. */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* Past eight months (a horizon of six months or a year), the
            bars take the card's whole row. */}
        <div className={flows.length > 8 ? "lg:col-span-2" : undefined}>
          <FlowBars flows={flows} />
        </div>
        <PostPie
          posts={byPost(spent)}
          action={
            <div className="w-48 max-w-full">
              <UrlFilters
                path={routes.financeTreasury}
                params={{ horizon: String(horizon) }}
                groups={[
                  {
                    key: "enveloppe",
                    label: t.envelopeFilter.label,
                    allLabel: t.envelopeFilter.all,
                    options: live.map((e) => ({ value: e.id, label: e.name })),
                    current: chosen.map((e) => e.id),
                  },
                ]}
              />
            </div>
          }
        />
      </div>
      <div className="grid items-start gap-4">
        <BudgetsCard
          availableCents={budgetsAvailable(rows)}
          activeEnvelopes={rows.length}
          budgets={rows.slice(0, 5).map(asBudgetRow)}
          names={new Map(rows.map((r) => [r.id, r.name] as const))}
        />
      </div>
      {treasury && (
        <TreasuryCalendar
          events={treasury.events}
          reserveCents={treasury.reserveCents}
          data={{
            spends: budgets.spends,
            incomes: data.incomes,
            targets: data.targets,
            today,
            proofIn:
              canManage && access.organizationId
                ? access.organizationId
                : undefined,
          }}
        />
      )}
    </FinanceFrame>
  );
}
