"use client";

import { useState } from "react";

import { DeclarationForm } from "@/components/catalog/master-page/declaration-form";
import { DeleteItemDialog } from "@/components/catalog/master-page/item-dialogs";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { legal } from "@/lib/i18n/fr/legal";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { LegalFactAction } from "@/lib/legal/types";

const fr = { legal, masterPage };

/** A filed declaration, opened by a click on its row: the title page's
 * own form, and « Supprimer » under it with the page's confirmation; the
 * page refreshes after each change. */
export function DeclarationDialog({
  action,
  open,
  onOpenChange,
}: {
  action: Extract<LegalFactAction, { kind: "edit_declaration" }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.masterPage.declarations;
  const [deleting, setDeleting] = useState(false);
  const { declaration, masterId } = action;
  const name = t.organisms[declaration.organism];

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={t.dialogTitle(name)}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <div className="flex flex-col gap-4">
          <DeclarationForm
            masterId={masterId}
            organism={declaration.organism}
            declaration={declaration}
            onDone={() => onOpenChange(false)}
          />
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            onClick={() => {
              onOpenChange(false);
              setDeleting(true);
            }}
          >
            {fr.legal.inventory.actions.removeDeclaration}
          </Button>
        </div>
      </FormDialog>
      <DeleteItemDialog
        masterId={masterId}
        section="declaration"
        item={deleting ? { id: declaration.id, name } : null}
        title={t.confirmTitle}
        body={t.confirmBody}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
