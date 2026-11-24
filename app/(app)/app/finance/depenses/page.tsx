import { IconMoneyBillCoin } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { QuickExpenseButton } from "@/components/budget/quick-expense-button";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { SpendsList } from "@/components/finance/spends-list";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { UrlFilters } from "@/components/ui/url-filters";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import {
  OFF_BUDGET_SLUG,
  SPEND_STATUS_SLUGS,
  spendsHref,
  type SpendStatusSlug,
} from "@/lib/finance/spend-links";
import { loadSpendPartNames } from "@/lib/finance/budget-envelope-queries";
import { loadSpends } from "@/lib/finance/spend-queries";
import {
  proofExpected,
  rebillMissing,
  spendDay,
  spendStage,
  type FinanceSpend,
  type SpendStage,
} from "@/lib/finance/spends";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { financeSpends as t } from "@/lib/i18n/fr/finance-spends";
import { budget } from "@/lib/i18n/fr/budget";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const STAGE_OF: Partial<Record<SpendStatusSlug, SpendStage>> = {
  prevu: "planned",
  engage: "committed",
  facture: "invoiced",
  paye: "paid",
};
const asStatus = (value: unknown): SpendStatusSlug | null =>
  SPEND_STATUS_SLUGS.find((s) => s === value) ?? null;

/**
 * Finance › Dépenses (Ibé's ticket, maquette 4, lot 3), laid out as the
 * proto's page (Sacha 15/11/2026): every spend of the label in one list,
 * the latest due first, filtered in the address by envelope (« Hors budget »
 * among them), by status (« À refacturer » among them) and « Sans
 * justificatif » (invoiced or paid without its proof); the search beside;
 * « prévu, engagé, facturé et payé » in the total under the list. Not the
 * team's Dépenses page (/app/expenses), which stays apart.
 */
export default async function FinanceSpendsPage({
  searchParams,
}: PageProps<"/app/finance/depenses">) {
  const today = parisPlace(new Date()).day;
  const [access, params, data, treasury, partNames] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
    loadSpends(),
    loadTreasury(today),
    loadSpendPartNames(),
  ]);
  const canManage = can(access, "manage_finance");
  const live = data.spends.filter((s) => !s.refused);
  const status = asStatus(params.statut);
  const envelope =
    typeof params.enveloppe === "string" ? params.enveloppe : null;
  const withoutProof = params.justificatif === "sans";
  const missing = (s: FinanceSpend) => !s.hasProof && proofExpected(s);

  const shown = live
    .filter((s) =>
      envelope === null
        ? true
        : envelope === OFF_BUDGET_SLUG
          ? s.target.kind === "off_budget"
          : s.target.id === envelope,
    )
    .filter((s) =>
      status === null
        ? true
        : status === "a-refacturer"
          ? rebillMissing(s)
          : spendStage(s.status) === STAGE_OF[status],
    )
    .filter((s) => !withoutProof || missing(s))
    .sort((a, b) => spendDay(b).localeCompare(spendDay(a)));

  // The envelopes some spend is on, named, then « Hors budget ».
  const names = new Map(treasury.targets.map((x) => [x.id, x.name]));
  const envelopes = [
    ...new Set(
      live
        .filter((s) => s.target.kind !== "off_budget")
        .map((s) => s.target.id),
    ),
  ]
    .map((id) => ({ value: id, label: names.get(id) ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  const keep = {
    enveloppe: envelope,
    statut: status,
    justificatif: withoutProof ? "sans" : null,
  };
  const action = canManage ? <QuickExpenseButton /> : undefined;
  const add = canManage ? <QuickExpenseButton iconOnly /> : undefined;
  const nothing = data.spends.length === 0 && !data.error;

  return (
    <FinanceFrame section="spends" action={nothing ? action : undefined}>
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {nothing ? (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <SpendsList
          spends={shown}
          targets={treasury.targets}
          canManage={canManage}
          organizationId={access.organizationId ?? ""}
          ownerId={access.personId}
          empty={<EmptyNote>{t.emptyView}</EmptyNote>}
          add={add}
          partNames={partNames}
          filters={
            <>
              <UrlFilters
                path={spendsHref({})}
                params={{ justificatif: keep.justificatif }}
                inline={2}
                groups={[
                  {
                    key: "enveloppe",
                    label: t.filters.envelope,
                    allLabel: t.filters.allEnvelopes,
                    options: [
                      ...envelopes,
                      { value: OFF_BUDGET_SLUG, label: budget.form.offBudget },
                    ],
                    current: envelope,
                  },
                  {
                    key: "statut",
                    label: t.filters.status,
                    allLabel: t.filters.allStatuses,
                    options: SPEND_STATUS_SLUGS.map((s) => ({
                      value: s,
                      label: t.filters.statuses[s],
                    })),
                    current: status,
                  },
                ]}
              />
              <SegmentedLinks
                label={t.proofView.label}
                options={[
                  {
                    key: "all",
                    href: spendsHref({
                      enveloppe: keep.enveloppe ?? undefined,
                      statut: keep.statut ?? undefined,
                    }),
                    label: t.proofView.all,
                    current: !withoutProof,
                  },
                  {
                    key: "missing",
                    href: spendsHref({
                      enveloppe: keep.enveloppe ?? undefined,
                      statut: keep.statut ?? undefined,
                      justificatif: "sans",
                    }),
                    label: (
                      <>
                        {t.proofView.missing}
                        <span className="text-[color:var(--text-tertiary)] tabular-nums">
                          {live.filter(missing).length}
                        </span>
                      </>
                    ),
                    current: withoutProof,
                  },
                ]}
              />
            </>
          }
        />
      )}
    </FinanceFrame>
  );
}
