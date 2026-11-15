import { IconCreditCard, IconPaperPlane2 } from "nucleo-sharp-essential";
import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { QuickExpenseButton } from "@/components/budget/quick-expense-button";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { BriefCard } from "@/components/finance/home/brief-card";
import { FinanceBriefCard } from "@/components/finance/home/finance-brief";
import { FinanceHome } from "@/components/finance/home/finance-home";
import { IncomeAddButton } from "@/components/finance/incomes-table";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import {
  BRIEF_HORIZON,
  briefSlots,
  codeBrief,
} from "@/lib/assistant/finance-brief/slots";
import { can, type Access } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { spendSums } from "@/lib/finance/aggregate";
import { cockpit, type Cockpit } from "@/lib/finance/cockpit";
import { financePeriod } from "@/lib/finance/period";
import { loadFinance } from "@/lib/finance/queries";
import {
  asHorizon,
  addDays,
  computeTreasury,
  type Treasury,
} from "@/lib/finance/treasury";
import { loadSpends } from "@/lib/finance/spend-queries";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { financeHome } from "@/lib/i18n/fr/finance-home";
import { treasury as t } from "@/lib/i18n/fr/treasury";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.titles.overview };

/** « Je veux… » (lot 7): what PO is first asked here, by position. The
 * direction starts from the treasury, the Finance from the money to chase
 * (proto finance-midday v8). Only those who read Finance see this page. */
function suggestionsFor(
  access: Access,
  treasury: Treasury | null,
  view: Cockpit,
  nameOf: (id: string) => string | undefined,
): string[] {
  const s = financeHome.ask;
  const top = view.budgets[0] ? nameOf(view.budgets[0].id) : undefined;
  const low = treasury ? [s.lowPoint] : [];
  const first =
    access.role === "general_director" ? [...low, s.late] : [s.late, ...low];
  return [...first, top ? s.rest(top) : s.noProof];
}

/**
 * Finance › Vue d'ensemble (Ibé's ticket « Cockpit Finance », maquette 1,
 * 13/11/2026): how much there is, what comes in and goes out, where to act.
 * For the direction and the Finance (read_finance); the Finance enters
 * money in from here (manage_finance). Every figure is computed by code
 * (lib/finance/treasury.ts, cockpit.ts). New style (Sacha 15/11/2026,
 * docs/FINANCE-V2.md): a greeting, then one card per thing to know.
 */
export default async function FinanceOverviewPage({
  searchParams,
}: PageProps<"/app/finance">) {
  const today = parisPlace(new Date()).day;
  const [access, params] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
  ]);
  const horizon = asHorizon(params.horizon);
  const [data, spending, spends] = await allInOrder([
    // Up to 90 days whatever the horizon shown: the week's summary looks
    // that far (lot 7); the cards keep to the horizon.
    loadTreasury(addDays(today, BRIEF_HORIZON)),
    loadFinance(financePeriod("tout", today)),
    loadSpends(),
  ]);
  const canManage = can(access, "manage_finance");
  const treasury = computeTreasury({ ...data, today, horizon });
  const names = new Map([
    ...spending.projects.map((p) => [p.id, p.title] as const),
    ...data.targets.map((x) => [x.id, x.name] as const),
  ]);
  const quiet = buttonVariants({ variant: "outline", size: "lg" });
  const view = cockpit({
    treasury,
    incomes: data.incomes,
    upcoming: data.upcoming,
    spending,
    spends: spends.spends,
    engines: data.engines,
    today,
    horizon,
  });
  // The week's summary (lot 7): figures chosen by code, worded by PO.
  const top = view.budgets[0];
  const slots = briefSlots({
    today,
    receipts: data.receipts,
    paid: data.paid,
    incomes: data.incomes,
    treasury:
      horizon === BRIEF_HORIZON
        ? treasury
        : computeTreasury({ ...data, today, horizon: BRIEF_HORIZON }),
    topBudget:
      top?.envelopeCents && names.has(top.id)
        ? {
            name: names.get(top.id) ?? "",
            share: top.engagedCents / top.envelopeCents,
          }
        : null,
    noProof: spendSums(spending.months).noProof,
  });
  const codeCard = (
    <BriefCard brief={{ text: codeBrief(slots), by: "code" }} slots={slots} />
  );

  return (
    <FinanceFrame section="overview" header={false}>
      {(data.error || spending.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      <FinanceHome
        firstName={access.firstName ?? null}
        treasury={treasury}
        view={view}
        horizon={horizon}
        names={names}
        brief={
          access.organizationId && !data.error && !spending.error ? (
            <Suspense fallback={codeCard}>
              <FinanceBriefCard
                organizationId={access.organizationId}
                today={today}
                slots={slots}
              />
            </Suspense>
          ) : (
            codeCard
          )
        }
        suggestions={suggestionsFor(access, treasury, view, (id) =>
          names.get(id),
        )}
        actions={
          <>
            <QuickExpenseButton outline />
            {canManage && access.organizationId && (
              <IncomeAddButton
                outline
                targets={data.targets}
                organizationId={access.organizationId}
                ownerId={access.personId}
              />
            )}
            {canManage && (
              <>
                <ViewLink href={routes.financeReconcile} className={quiet}>
                  <IconCreditCard aria-hidden data-icon="inline-start" />
                  {financeHome.importStatement}
                </ViewLink>
                <ViewLink href={routes.financeExports} className={quiet}>
                  <IconPaperPlane2 aria-hidden data-icon="inline-start" />
                  {financeHome.export}
                </ViewLink>
              </>
            )}
          </>
        }
      />
    </FinanceFrame>
  );
}
