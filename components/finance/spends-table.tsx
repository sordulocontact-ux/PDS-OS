"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { IconArrowDottedRotateAnticlockwise } from "nucleo-sharp-essential";
import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { FinanceSheet } from "@/components/finance/finance-sheet";
import { IncomeForm } from "@/components/finance/income-form";
import { SpendSheet } from "@/components/finance/spend-sheet";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { isFinanceTarget, type BudgetLine } from "@/lib/budget/types";
import {
  rebillMissing,
  spendDay,
  spendTtc,
  type FinanceSpend,
} from "@/lib/finance/spends";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { budget } from "@/lib/i18n/fr/budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeSpends } from "@/lib/i18n/fr/finance-spends";
import { treasury } from "@/lib/i18n/fr/treasury";
import { budgetTargetHue } from "@/lib/ui/category-hues";
import { spendCashTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, dialogs, financeSpends, treasury };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/** A Finance spend as the one spend form edits it. */
function asLine(spend: FinanceSpend, targetLabel: string | null): BudgetLine {
  return {
    id: spend.id,
    target: spend.target,
    targetLabel,
    label: spend.label,
    spentOn: spend.spentOn,
    authorName: null,
    amountCents: spend.cents,
    status: spend.status,
    family: spend.family,
    familyDetail: spend.familyDetail,
    subpost: spend.subpost,
    leverId: null,
    leverLabel: null,
    deliverableId: null,
    deliverableTitle: null,
    attachment: spend.proof
      ? { id: spend.id, name: spend.proof.name, url: null }
      : null,
    note: spend.note,
    invoiceId: null,
    committedCents: null,
    vatBp: spend.vatBp,
    supplierContactId: spend.supplierContactId,
    supplierName: spend.supplier,
    dueOn: spend.dueOn,
    rebillable: spend.rebillable,
    validatorId: spend.validatorId,
  };
}

/**
 * Every spend of the label (Finance › Dépenses): what and from whom, its
 * envelope (project, artist, cost center, « Hors budget »), the day it goes
 * out, its state, its amount TTC (HT below). The Finance changes the
 * spends of its own envelopes and plans the rebilling of a rebillable one;
 * a project's or an artist's spend is changed from its Budget.
 */
export function SpendsTable({
  spends,
  targets,
  canManage,
  organizationId,
  ownerId,
}: {
  spends: FinanceSpend[];
  targets: FinanceTarget[];
  canManage: boolean;
  organizationId: string;
  ownerId: string | null;
}) {
  const t = fr.financeSpends;
  const c = t.columns;
  const name = new Map(targets.map((x) => [x.id, x.name]));
  const [open, setOpen] = useState<{
    kind: "edit" | "rebill";
    spend: FinanceSpend;
  } | null>(null);
  // The row open in the side sheet (lot 3, docs/FINANCE-V2.md).
  const [sheet, setSheet] = useState<number | null>(null);
  const envelopeOf = (spend: FinanceSpend) =>
    spend.target.kind === "off_budget"
      ? fr.budget.form.offBudget
      : (name.get(spend.target.id) ?? EMPTY_CELL);

  function actionsOf(spend: FinanceSpend): RowAction[] {
    return [
      ...(isFinanceTarget(spend.target)
        ? [
            {
              key: "edit",
              label: t.edit,
              icon: IconPenWriting2,
              onSelect: () => setOpen({ kind: "edit", spend }),
            },
          ]
        : []),
      ...(rebillMissing(spend)
        ? [
            {
              key: "rebill",
              label: t.planRebill,
              icon: IconArrowDottedRotateAnticlockwise,
              onSelect: () => setOpen({ kind: "rebill", spend }),
            },
          ]
        : []),
    ];
  }

  return (
    <>
      <DataTable framed>
        <DataTableHeader>
          <DataTableHead fill>{c.label}</DataTableHead>
          <DataTableHead hideBelow="lg">{c.envelope}</DataTableHead>
          <DataTableHead hideBelow="sm">{c.day}</DataTableHead>
          <DataTableHead hideBelow="md">{c.state}</DataTableHead>
          <DataTableHead align="end">{c.amount}</DataTableHead>
          {canManage && <DataTableActionsHead label={c.actions} />}
        </DataTableHeader>
        <DataTableBody>
          {spends.map((spend, index) => {
            const actions = canManage ? actionsOf(spend) : [];
            return (
              <DataTableRow key={spend.id}>
                <DataTableCell fill>
                  <DataTableMedia
                    title={
                      <DataTableLink href={null} onOpen={() => setSheet(index)}>
                        {spend.label}
                      </DataTableLink>
                    }
                    subtitle={[
                      spend.family &&
                        (spend.family === "other"
                          ? spend.familyDetail
                          : fr.budget.families[spend.family]),
                      spend.supplier,
                      spend.rebillable && t.rebillable,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                </DataTableCell>
                <DataTableCell hideBelow="lg">
                  <span className="flex min-w-0 items-center gap-2">
                    <StatusBadge
                      tone={budgetTargetHue[spend.target.kind]}
                      size="sm"
                    >
                      {fr.budget.form.targetKinds[spend.target.kind]}
                    </StatusBadge>
                    {spend.target.kind !== "off_budget" && (
                      <span className="truncate text-[color:var(--text-secondary)]">
                        {envelopeOf(spend)}
                      </span>
                    )}
                  </span>
                </DataTableCell>
                <DataTableCell hideBelow="sm" className="tabular-nums">
                  {formatDay(spendDay(spend), { weekday: false })}
                </DataTableCell>
                <DataTableCell hideBelow="md">
                  <StatusBadge tone={spendCashTone[spend.status]}>
                    {fr.treasury.spendStates[spend.status]}
                  </StatusBadge>
                </DataTableCell>
                <DataTableCell align="end" className="tabular-nums">
                  <span className="grid justify-items-end">
                    <span>{amount(spendTtc(spend))}</span>
                    {spend.vatBp !== null && (
                      <span className="text-caption text-[color:var(--text-secondary)]">
                        {t.ht(amount(spend.cents))}
                      </span>
                    )}
                  </span>
                </DataTableCell>
                {canManage && (
                  <DataTableActionsCell>
                    {actions.length > 0 && (
                      <RowActions
                        label={t.rowActions(spend.label)}
                        reveal
                        actions={actions}
                      />
                    )}
                  </DataTableActionsCell>
                )}
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      {sheet !== null && spends[sheet] && (
        <FinanceSheet
          open
          onClose={() => setSheet(null)}
          title={spends[sheet].label}
          index={sheet}
          total={spends.length}
          onMove={setSheet}
        >
          <SpendSheet
            spend={spends[sheet]}
            envelope={envelopeOf(spends[sheet])}
            actions={canManage ? actionsOf(spends[sheet]) : []}
          />
        </FinanceSheet>
      )}
      {open && (
        <FormDialog
          open
          onOpenChange={(next) => !next && setOpen(null)}
          title={open.kind === "edit" ? t.editTitle : t.rebillTitle}
          description={
            open.kind === "edit"
              ? t.editDescription
              : t.rebillDescription(open.spend.label)
          }
          closeLabel={fr.dialogs.close}
          size={open.kind === "rebill" ? "medium" : "default"}
        >
          {open.kind === "edit" ? (
            <BudgetLineForm
              target={open.spend.target}
              line={asLine(open.spend, envelopeOf(open.spend))}
              organizationId={organizationId}
              onDone={() => setOpen(null)}
            />
          ) : (
            <IncomeForm
              income={null}
              targets={targets}
              organizationId={organizationId}
              ownerId={ownerId}
              prefill={{
                label: fr.budget.rebilling.label(open.spend.label),
                kind: "rebilling",
                cents: spendTtc(open.spend),
                projectId:
                  open.spend.target.kind === "project"
                    ? open.spend.target.id
                    : null,
                artistId:
                  open.spend.target.kind === "artist"
                    ? open.spend.target.id
                    : null,
                expectedOn: spendDay(open.spend),
                sourceLineId: open.spend.id,
              }}
              onDone={() => setOpen(null)}
            />
          )}
        </FormDialog>
      )}
    </>
  );
}
