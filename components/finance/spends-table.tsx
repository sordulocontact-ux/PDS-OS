"use client";

import { useState } from "react";

import {
  IconArrowDottedRotateAnticlockwise,
  IconPaperclip,
  IconPenWriting2,
} from "nucleo-sharp-essential";
import { BudgetLineForm } from "@/components/budget/budget-line-form";
import { FinanceSheet } from "@/components/finance/finance-sheet";
import { PostLabel } from "@/components/finance/post-label";
import { IncomeForm } from "@/components/finance/income-form";
import { SpendSheet } from "@/components/finance/spend-sheet";
import type { SpendColumn } from "@/components/finance/spend-columns";
import { useSheetRow } from "@/components/finance/use-sheet-row";
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
import { routes } from "@/lib/auth/redirects";
import { isFinanceTarget, type BudgetLine } from "@/lib/budget/types";
import {
  proofExpected,
  rebillMissing,
  spendDay,
  spendTtc,
  tableDay,
  type FinanceSpend,
} from "@/lib/finance/spends";
import type { FinanceTarget } from "@/lib/finance/treasury-queries";
import { budget } from "@/lib/i18n/fr/budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeSpends } from "@/lib/i18n/fr/finance-spends";
import { treasury } from "@/lib/i18n/fr/treasury";
import { spendCashTone } from "@/lib/ui/state-tones";
import { formatAmount } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

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
 * budget (project, artist, other, « Hors budget »), the day it goes
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
  columns,
  hideEnvelope = false,
}: {
  spends: FinanceSpend[];
  targets: FinanceTarget[];
  canManage: boolean;
  organizationId: string;
  ownerId: string | null;
  // The columns one may hide that are shown (Dépenses' « Colonnes »);
  // all of them when absent.
  columns?: Set<SpendColumn>;
  // On a budget's own page, where the envelope column says nothing.
  hideEnvelope?: boolean;
}) {
  const show = (column: SpendColumn) => !columns || columns.has(column);
  const t = fr.financeSpends;
  const c = t.columns;
  const name = new Map(targets.map((x) => [x.id, x.name]));
  const [open, setOpen] = useState<{
    kind: "edit" | "rebill";
    spend: FinanceSpend;
  } | null>(null);
  // The row open in the side sheet (lot 3, docs/FINANCE-V2.md).
  const [sheet, setSheet] = useSheetRow(spends.map((row) => row.id));
  const envelopeOf = (spend: FinanceSpend) =>
    spend.target.kind === "off_budget"
      ? fr.budget.form.offBudget
      : (name.get(spend.target.id) ?? EMPTY_CELL);

  function actionsOf(spend: FinanceSpend): RowAction[] {
    return [
      // A cost center's or off-budget spend is changed here; a project's or
      // an artist's in its own Budget.
      isFinanceTarget(spend.target)
        ? {
            key: "edit",
            label: t.edit,
            icon: IconPenWriting2,
            onSelect: () => setOpen({ kind: "edit", spend }),
          }
        : {
            key: "edit",
            label:
              spend.target.kind === "artist" ? t.editInArtist : t.editInProject,
            icon: IconPenWriting2,
            href:
              spend.target.kind === "artist"
                ? routes.artistBudget(spend.target.id)
                : routes.projectBudget(spend.target.id),
          },
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
          {!hideEnvelope && (
            <DataTableHead hideBelow="lg">{c.envelope}</DataTableHead>
          )}
          {show("post") && (
            <DataTableHead hideBelow="xl">{c.post}</DataTableHead>
          )}
          {show("supplier") && (
            <DataTableHead hideBelow="xl">{c.supplier}</DataTableHead>
          )}
          {show("day") && <DataTableHead hideBelow="sm">{c.day}</DataTableHead>}
          {show("state") && (
            <DataTableHead hideBelow="md">{c.state}</DataTableHead>
          )}
          {show("proof") && (
            <DataTableHead hideBelow="lg">{c.proof}</DataTableHead>
          )}
          <DataTableHead align="end" className="w-28 sm:w-48">
            {c.amount}
          </DataTableHead>
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
                    subtitle={
                      [spend.subpost, spend.rebillable && t.rebillable]
                        .filter(Boolean)
                        .join(" · ") || null
                    }
                  />
                </DataTableCell>
                {!hideEnvelope && (
                  <DataTableCell hideBelow="lg">
                    {/* The envelope's name alone (Sacha 15/11/2026). */}
                    <span
                      className={cn(
                        "block truncate",
                        spend.target.kind === "off_budget" &&
                          "text-[color:var(--text-secondary)]",
                      )}
                    >
                      {envelopeOf(spend)}
                    </span>
                  </DataTableCell>
                )}
                {show("post") && (
                  <DataTableCell hideBelow="xl">
                    {spend.family ? (
                      <PostLabel
                        family={spend.family}
                        label={
                          spend.family === "other"
                            ? (spend.familyDetail ?? fr.budget.families.other)
                            : fr.budget.families[spend.family]
                        }
                      />
                    ) : (
                      EMPTY_CELL
                    )}
                  </DataTableCell>
                )}
                {show("supplier") && (
                  <DataTableCell hideBelow="xl">
                    {spend.supplier ?? EMPTY_CELL}
                  </DataTableCell>
                )}
                {show("day") && (
                  <DataTableCell hideBelow="sm" className="tabular-nums">
                    {tableDay(spendDay(spend))}
                  </DataTableCell>
                )}
                {show("state") && (
                  <DataTableCell hideBelow="md">
                    <StatusBadge tone={spendCashTone[spend.status]}>
                      {fr.treasury.spendStates[spend.status]}
                    </StatusBadge>
                  </DataTableCell>
                )}
                {show("proof") && (
                  <DataTableCell hideBelow="lg">
                    {spend.hasProof ? (
                      <IconPaperclip
                        aria-label={t.proofAttached}
                        className="size-4 text-[color:var(--text-secondary)]"
                      />
                    ) : proofExpected(spend) ? (
                      <StatusBadge tone="warning">{t.proofMissing}</StatusBadge>
                    ) : (
                      <span className="text-[color:var(--text-secondary)]">
                        {t.proofLater}
                      </span>
                    )}
                  </DataTableCell>
                )}
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
            proofIn={canManage && organizationId ? organizationId : undefined}
          />
        </FinanceSheet>
      )}
      {open && (
        <FormDialog
          open
          onOpenChange={(next) => !next && setOpen(null)}
          title={open.kind === "edit" ? t.editTitle : t.rebillTitle}
          description={
            open.kind === "rebill"
              ? t.rebillDescription(open.spend.label)
              : undefined
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
