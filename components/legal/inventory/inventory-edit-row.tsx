"use client";

import { ContributorForm } from "@/components/catalog/master-page/contributor-form";
import { MasterEditForm } from "@/components/catalog/master-edit-form";
import { DeclarationDialog } from "@/components/legal/inventory/declaration-dialog";
import { DeclareDialog } from "@/components/legal/inventory/declare-dialog";
import { SplitsEditorDialog } from "@/components/legal/inventory/splits-editor-dialog";
import { TitleRightsDialog } from "@/components/legal/inventory/title-rights-dialog";
import { FactRowDialog } from "@/components/ui/fact-row-dialog";
import type { FactRowProps } from "@/components/ui/fact-row-frame";
import { FormDialog } from "@/components/ui/form-dialog";
import { legal } from "@/lib/i18n/fr/legal";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { records } from "@/lib/i18n/fr/records";
import type { LegalRowEdit } from "@/lib/legal/types";

const fr = { legal, masterPage, records };

/**
 * A row of the État des lieux edited from the page itself: a click opens
 * the record's own form in a modal (title, rights, credit, shares,
 * declaration), never a trip to the catalog. `missing`: « Compléter »,
 * else « Modifier ».
 */
export function InventoryEditRow({
  action,
  missing,
  ...row
}: Omit<FactRowProps, "href" | "onClick"> & {
  action: LegalRowEdit;
  missing: boolean;
}) {
  const t = fr.legal.inventory.actions;
  return (
    <FactRowDialog
      {...row}
      actionLabel={missing ? t.complete : t.edit}
      dialog={(open, onOpenChange) => (
        <EditDialog action={action} open={open} onOpenChange={onOpenChange} />
      )}
    />
  );
}

function EditDialog({
  action,
  open,
  onOpenChange,
}: {
  action: LegalRowEdit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const close = () => onOpenChange(false);
  switch (action.kind) {
    case "edit_splits":
      return (
        <SplitsEditorDialog
          action={action}
          open={open}
          onOpenChange={onOpenChange}
        />
      );
    case "declare":
      return (
        <DeclareDialog
          titles={[{ id: action.masterId, title: action.title }]}
          declared={{}}
          open={open}
          onOpenChange={onOpenChange}
        />
      );
    case "edit_declaration":
      return (
        <DeclarationDialog
          action={action}
          open={open}
          onOpenChange={onOpenChange}
        />
      );
    case "edit_rights":
      return (
        <TitleRightsDialog
          masterId={action.masterId}
          rights={action.rights}
          open={open}
          onOpenChange={onOpenChange}
        />
      );
    case "edit_title":
      return (
        <FormDialog
          open={open}
          onOpenChange={onOpenChange}
          title={fr.records.edit.title.master}
          description={fr.records.edit.description.master}
          closeLabel={fr.records.edit.close}
        >
          {/* Read when the modal opens only. */}
          {open && (
            <MasterEditForm
              masterId={action.masterId}
              onSaved={close}
              onCancel={close}
            />
          )}
        </FormDialog>
      );
    case "edit_credit":
      return (
        <FormDialog
          open={open}
          onOpenChange={onOpenChange}
          title={fr.masterPage.credits.editTitle}
          description={fr.masterPage.credits.formDescription}
          closeLabel={fr.masterPage.form.close}
        >
          <ContributorForm
            masterId={action.masterId}
            contributor={action.contributor}
            onDone={close}
            onCancel={close}
          />
        </FormDialog>
      );
  }
}
