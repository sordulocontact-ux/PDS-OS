import { FormMessage } from "@/components/auth/form-message";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { TreasuryCalendar } from "@/components/finance/treasury-calendar";
import { TreasuryCard } from "@/components/finance/treasury-card";
import {
  ReserveButton,
  StatementButton,
} from "@/components/finance/treasury-forms";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
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
 * Finance › Trésorerie (Ibé's ticket, maquette 6): today's balance, the
 * balance at 30, 60 or 90 days (?horizon=), the low point against the
 * minimum reserve, the curve and every move it counts. The Finance updates
 * the balance and the reserve here (manage_finance).
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
  const data = await loadTreasury(addDays(today, horizon));
  const treasury = computeTreasury({ ...data, today, horizon });
  const canManage = can(access, "manage_finance");
  const names = new Map(data.targets.map((x) => [x.id, x.name] as const));
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
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      <TreasuryCard
        treasury={treasury}
        horizon={horizon}
        canManage={canManage}
        detailed
        control={
          <SegmentedLinks
            label={p.horizon}
            options={TREASURY_HORIZONS.map((days) => ({
              key: String(days),
              href: `${routes.financeTreasury}?horizon=${days}`,
              label: p.horizonOption(days),
              current: days === horizon,
            }))}
          />
        }
      />
      {treasury && <TreasuryCalendar treasury={treasury} names={names} />}
    </FinanceFrame>
  );
}
