"use client";

import { useState } from "react";

import { DeclarationForm } from "@/components/catalog/master-page/declaration-form";
import {
  DeleteItemDialog,
  ItemRowActions,
} from "@/components/catalog/master-page/item-dialogs";
import { FormDialog } from "@/components/ui/form-dialog";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { LegalFactAction } from "@/lib/legal/types";

const fr = { masterPage };

/** "⋯" of a filed declaration: edit or remove it, with the title page's
 * own form and confirmation; the page refreshes after each change. */
export function DeclarationRowActions({
  action,
}: {
  action: Extract<LegalFactAction, { kind: "edit_declaration" }>;
}) {
  const t = fr.masterPage.declarations;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { declaration, masterId } = action;
  const name = t.organisms[declaration.organism];

  return (
    <>
      <ItemRowActions
        name={name}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting(true)}
      />
      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title={t.dialogTitle(name)}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <DeclarationForm
          masterId={masterId}
          organism={declaration.organism}
          declaration={declaration}
          onDone={() => {
            setEditing(false);
          }}
        />
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="declaration"
        item={deleting ? { id: declaration.id, name } : null}
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={() => {
          setDeleting(false);
        }}
      />
    </>
  );
}
