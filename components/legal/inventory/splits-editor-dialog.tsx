"use client";

import { useState } from "react";

import {
  AddItemButton,
  DeleteItemDialog,
} from "@/components/catalog/master-page/item-dialogs";
import { SplitForm } from "@/components/catalog/master-page/split-form";
import { SplitsTable } from "@/components/catalog/master-page/splits-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  formatShare,
  splitTotal,
  type MasterSplit,
} from "@/lib/catalog/master/rules";
import { legal } from "@/lib/i18n/fr/legal";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { LegalFactAction } from "@/lib/legal/types";

const fr = { legal, masterPage };

/**
 * A title's shares of one kind, opened by a click on its row of the État
 * des lieux: one modal holding the list of shares (as on the title's
 * Splits) and, in its place, the share form. Every write refreshes the
 * page, so the list and the row's state follow; the total never passes
 * 100 % (checked in SQL).
 */
export function SplitsEditorDialog({
  action,
  open,
  onOpenChange,
}: {
  action: Extract<LegalFactAction, { kind: "edit_splits" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.masterPage.splits;
  const l = fr.legal.inventory.actions;
  const [form, setForm] = useState<{ split: MasterSplit | null } | null>(null);
  const [deleting, setDeleting] = useState<MasterSplit | null>(null);

  const kind = action.splitKind;
  const rows = action.shares.filter((share) => share.kind === kind);
  const total = splitTotal(action.shares, kind);
  const formKind = form?.split?.kind ?? kind;
  const available =
    splitTotal(action.shares, formKind).remaining +
    (form?.split?.kind === formKind ? form.split.share : 0);

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) setForm(null);
        }}
        title={
          form
            ? form.split
              ? t.editTitle
              : t.addTitle
            : l.splitsTitle(t.kinds[kind], action.title)
        }
        description={form ? t.formDescription : t.kindDescriptions[kind]}
        closeLabel={fr.masterPage.form.close}
      >
        {form ? (
          <SplitForm
            masterId={action.masterId}
            split={form.split}
            kind={kind}
            available={available}
            onDone={() => {
              setForm(null);
            }}
          />
        ) : (
          <div className="flex flex-col gap-5">
            {rows.length === 0 ? (
              <EmptyNote>{t.empty}</EmptyNote>
            ) : (
              <SplitsTable
                rows={rows}
                canEdit
                onEdit={(split) => setForm({ split })}
                onDelete={setDeleting}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground tabular-nums">
                {t.total(formatShare(total.total))}
              </p>
              {total.status !== "complete" && (
                <AddItemButton
                  label={t.add}
                  onClick={() => setForm({ split: null })}
                />
              )}
            </div>
          </div>
        )}
      </FormDialog>
      <DeleteItemDialog
        masterId={action.masterId}
        section="split"
        item={deleting ? { id: deleting.id, name: deleting.party } : null}
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={() => {
          setDeleting(null);
        }}
      />
    </>
  );
}
