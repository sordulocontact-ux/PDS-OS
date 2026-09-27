"use client";

import { useState } from "react";

import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  SPLIT_KINDS,
  formatShare,
  splitTotal,
  type MasterSplit,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";
import { splitStatusTone } from "@/lib/ui/state-tones";

import {
  AddItemButton,
  DeleteItemDialog,
  ItemRowActions,
  useItemDialogs,
} from "./item-dialogs";
import { SplitForm } from "./split-form";

// Shares of the master and of the publishing, one section each: total and
// remainder computed by code (splitTotal), never above 100 % (SQL).
export function SplitsSection({
  masterId,
  splits,
  canEdit,
}: {
  masterId: string;
  splits: MasterSplit[];
  canEdit: boolean;
}) {
  const t = fr.masterPage.splits;
  const dialogs = useItemDialogs<MasterSplit>();
  const [addKind, setAddKind] = useState<SplitKind>("master");
  const editing = dialogs.editing?.item ?? null;
  const formKind = editing?.kind ?? addKind;
  const available =
    splitTotal(splits, formKind).remaining +
    (editing?.kind === formKind ? editing.share : 0);

  return (
    <>
      {SPLIT_KINDS.map((kind) => {
        const rows = splits.filter((s) => s.kind === kind);
        const total = splitTotal(splits, kind);
        return (
          <PageSection
            key={kind}
            id={`splits-${kind}`}
            title={t.kinds[kind]}
            description={t.kindDescriptions[kind]}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={splitStatusTone[total.status]}>
                  {total.status === "incomplete"
                    ? t.status.incomplete(formatShare(total.remaining))
                    : t.status[total.status]}
                </StatusBadge>
                {canEdit && total.status !== "complete" && (
                  <AddItemButton
                    label={t.add}
                    onClick={() => {
                      setAddKind(kind);
                      dialogs.add();
                    }}
                  />
                )}
              </div>
            }
          >
            {rows.length === 0 ? (
              <EmptyNote>{t.empty}</EmptyNote>
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableHead>{t.columns.party}</DataTableHead>
                  <DataTableHead hideBelow="sm">{t.columns.role}</DataTableHead>
                  <DataTableHead fill align="end">
                    {t.columns.share}
                  </DataTableHead>
                  {canEdit && (
                    <DataTableActionsHead label={t.columns.actions} />
                  )}
                </DataTableHeader>
                <DataTableBody>
                  {rows.map((split) => (
                    <DataTableRow key={split.id}>
                      <DataTableCell>{split.party}</DataTableCell>
                      <DataTableCell hideBelow="sm">
                        {t.roles[split.role]}
                      </DataTableCell>
                      <DataTableCell fill align="end" className="tabular-nums">
                        {formatShare(split.share)}
                      </DataTableCell>
                      {canEdit && (
                        <DataTableActionsCell>
                          <ItemRowActions
                            name={split.party}
                            onEdit={() => dialogs.edit(split)}
                            onDelete={() => dialogs.remove(split)}
                          />
                        </DataTableActionsCell>
                      )}
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
            <p className="text-sm text-muted-foreground tabular-nums">
              {t.total(formatShare(total.total))}
            </p>
          </PageSection>
        );
      })}

      <FormDialog
        open={dialogs.editing !== null}
        onOpenChange={(open) => !open && dialogs.closeForm()}
        title={editing ? t.editTitle : t.addTitle}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <SplitForm
          masterId={masterId}
          split={editing}
          kind={formKind}
          available={available}
          onDone={dialogs.closeForm}
        />
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="split"
        item={
          dialogs.deleting
            ? { id: dialogs.deleting.id, name: dialogs.deleting.party }
            : null
        }
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={dialogs.closeDelete}
      />
    </>
  );
}
