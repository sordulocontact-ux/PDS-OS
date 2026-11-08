"use client";

import {
  IconMoneyBillCoin,
  IconPenWriting2,
  IconPlus,
  IconTrash,
} from "nucleo-sharp-essential";
import Link from "next/link";
import { useState } from "react";

import { ArtistBudgetCategories } from "@/components/catalog/artist-budget/artist-budget-categories";
import { ArtistExpenseForm } from "@/components/catalog/artist-budget/artist-expense-form";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { Rows } from "@/components/ui/rows";
import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import { deleteArtistExpense } from "@/lib/catalog/artist-expense-actions";
import {
  type ArtistExpense,
  type ArtistProjectSpend,
  artistBudgetTotals,
} from "@/lib/catalog/artist-expenses";
import { artistBudget } from "@/lib/i18n/fr/artist-budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { budgetStatusTone } from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";

const fr = { artistBudget, dialogs };

/**
 * « Budget » of a signed artist: four totals computed by code (its paid and
 * planned spends, what its projects owe, the sum), « Par poste », its spends newest first
 * with « Nouvelle dépense », edit and delete, then each project's share
 * linked to its Budget. Only shown to the Catalogue (manage_catalog).
 */
export function ArtistBudget({
  artistId,
  expenses,
  projects,
  today,
}: {
  artistId: string;
  expenses: ArtistExpense[];
  projects: ArtistProjectSpend[];
  today: string;
}) {
  const t = fr.artistBudget;
  const totals = artistBudgetTotals(expenses, projects);
  const [editing, setEditing] = useState<ArtistExpense | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ArtistExpense | null>(null);
  const remove = useFramingAction({ inline: true });

  const openForm = (expense: ArtistExpense | null) => {
    setEditing(expense);
    setFormOpen(true);
  };
  const addButton = (
    <Button size="lg" onClick={() => openForm(null)}>
      <IconPlus aria-hidden data-icon="inline-start" />
      {t.add}
    </Button>
  );
  const categoryOf = (expense: ArtistExpense) =>
    expense.category === "other" && expense.categoryDetail
      ? `${t.categories.other} : ${expense.categoryDetail}`
      : t.categories[expense.category];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>

      <StatTiles
        columns={4}
        stats={[
          {
            label: t.tiles.paid,
            value: formatAmount(totals.paidCents),
            hint: t.tiles.paidHint,
          },
          {
            label: t.tiles.planned,
            value: formatAmount(totals.plannedCents),
            hint: t.tiles.plannedHint,
          },
          {
            label: t.tiles.projects,
            value: formatAmount(totals.projectsCents),
            hint: t.tiles.projectsHint(projects.length),
          },
          {
            label: t.tiles.total,
            value: formatAmount(totals.totalCents),
            hint: t.tiles.totalHint,
          },
        ]}
      />

      <ArtistBudgetCategories expenses={expenses} />

      {expenses.length === 0 ? (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={t.empty.title}
          body={t.empty.body}
          action={addButton}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">{addButton}</div>
          <DataTable>
            <DataTableHeader>
              <DataTableHead fill>{t.table.label}</DataTableHead>
              <DataTableHead hideBelow="sm">{t.table.date}</DataTableHead>
              <DataTableHead hideBelow="sm">{t.table.status}</DataTableHead>
              <DataTableHead align="end">{t.table.amount}</DataTableHead>
              <DataTableHead align="end" className="w-24">
                <span className="sr-only">{t.table.actions}</span>
              </DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {expenses.map((expense) => (
                <DataTableRow key={expense.id}>
                  <DataTableCell fill>
                    <DataTableMedia
                      title={<span className="truncate">{expense.label}</span>}
                      subtitle={[categoryOf(expense), expense.note]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  </DataTableCell>
                  <DataTableCell hideBelow="sm" className="tabular-nums">
                    {formatShortDay(expense.spentOn, { bare: true })}
                  </DataTableCell>
                  <DataTableCell hideBelow="sm">
                    <StatusBadge
                      tone={budgetStatusTone[expense.status]}
                      size="sm"
                    >
                      {t.statuses[expense.status]}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell align="end" className="tabular-nums">
                    {formatAmount(expense.amountCents)}
                  </DataTableCell>
                  <DataTableCell align="end" className="w-24">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.edit(expense.label)}
                        onClick={() => openForm(expense)}
                      >
                        <IconPenWriting2 aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.remove(expense.label)}
                        onClick={() => setDeleting(expense)}
                      >
                        <IconTrash aria-hidden />
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {projects.length > 0 && (
        <PageSection
          id="artist-budget-projects"
          title={t.projects.title}
          description={t.projects.hint}
        >
          <Rows label={t.projects.title}>
            {projects.map((project) => (
              <li key={project.projectId}>
                <Link
                  href={routes.projectBudget(project.projectId)}
                  aria-label={t.projects.open(project.title)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {project.title}
                  </span>
                  <span className="text-sm tabular-nums">
                    {formatAmount(project.committedCents)}
                  </span>
                </Link>
              </li>
            ))}
          </Rows>
        </PageSection>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t.form.editTitle : t.form.newTitle}
        description={t.form.description}
        closeLabel={fr.dialogs.close}
      >
        <ArtistExpenseForm
          key={editing?.id ?? "new"}
          artistId={artistId}
          expense={editing}
          today={today}
          onDone={() => setFormOpen(false)}
        />
      </FormDialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (open) return;
          remove.clearError();
          setDeleting(null);
        }}
        title={t.confirm.title}
        description={deleting ? t.confirm.body(deleting.label) : ""}
        cancelLabel={t.form.cancel}
        closeLabel={t.form.close}
        confirmLabel={t.confirm.confirm}
        pendingLabel={t.confirm.deleting}
        pending={remove.pending}
        destructive
        error={remove.error}
        onConfirm={() => {
          if (!deleting) return;
          remove.run(
            () => deleteArtistExpense(artistId, deleting.id),
            () => {
              toast.success(t.confirm.deleted);
              setDeleting(null);
            },
          );
        }}
      />
    </div>
  );
}
