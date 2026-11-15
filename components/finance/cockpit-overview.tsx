import { BudgetsCard } from "@/components/finance/budgets-card";
import { FlowCard } from "@/components/finance/flow-card";
import { TreasuryCard } from "@/components/finance/treasury-card";
import { WatchCard } from "@/components/finance/watch-card";
import { routes } from "@/lib/auth/redirects";
import type { Cockpit } from "@/lib/finance/cockpit";
import type { Treasury, TreasuryHorizon } from "@/lib/finance/treasury";

/**
 * Finance's overview (maquette 1 of Ibé's ticket, laid out after Midday's
 * reports, Sacha 13/11/2026): one main card, the balance and its curve;
 * then three cards of the same anatomy, what comes in, what goes out and
 * what the budgets still allow; then where to act.
 */
export function CockpitOverview({
  treasury,
  view,
  horizon,
  names,
  canManage,
  canOpenExpenses,
}: {
  treasury: Treasury | null;
  view: Cockpit;
  horizon: TreasuryHorizon;
  names: Map<string, string>;
  canManage: boolean;
  canOpenExpenses: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TreasuryCard
        treasury={treasury}
        horizon={horizon}
        canManage={canManage}
      />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <FlowCard
          side="incoming"
          flow={view.incoming}
          horizon={horizon}
          href={routes.financeIncomes}
          names={names}
        />
        <FlowCard
          side="outgoing"
          flow={view.outgoing}
          horizon={horizon}
          href={routes.financeTreasury}
          names={names}
        />
        <BudgetsCard
          availableCents={view.availableCents}
          activeEnvelopes={view.activeEnvelopes}
          budgets={view.budgets}
          names={names}
        />
      </div>
      <WatchCard
        items={view.watch}
        names={names}
        canOpenExpenses={canOpenExpenses}
      />
    </div>
  );
}
