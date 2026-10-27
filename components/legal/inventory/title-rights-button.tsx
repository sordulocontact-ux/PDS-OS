"use client";

import { useState } from "react";

import { RightsForm } from "@/components/catalog/master-page/rights-form";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import type { MasterRights } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

/** « Modifier les droits » of a title (ISWC, ℗), with the title page's form. */
export function TitleRightsButton({
  masterId,
  rights,
}: {
  masterId: string;
  rights: MasterRights;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {fr.legal.inventory.actions.editRights}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={fr.masterPage.rights.editTitle}
        description={fr.masterPage.rights.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <RightsForm
          masterId={masterId}
          rights={rights}
          onDone={() => {
            setOpen(false);
          }}
        />
      </FormDialog>
    </>
  );
}
