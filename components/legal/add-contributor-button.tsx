"use client";

import { useState } from "react";

import { ContributorForm } from "@/components/catalog/master-page/contributor-form";
import { AddItemButton } from "@/components/catalog/master-page/item-dialogs";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";

/**
 * "Ajouter un contributeur" on the Personnes section of the État des lieux:
 * the title page's own form (same action, same rules), with a choice of the
 * title when the project has several. Saved, the page refreshes and the
 * person is listed.
 */
export function AddContributorButton({
  titles,
}: {
  titles: Array<{ id: string; title: string }>;
}) {
  const [open, setOpen] = useState(false);
  const t = fr.masterPage.credits;
  const first = titles[0];
  if (!first) return null;

  return (
    <>
      <AddItemButton label={t.add} onClick={() => setOpen(true)} />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.addTitle}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <ContributorForm
          masterId={first.id}
          titles={titles}
          contributor={null}
          onDone={() => {
            setOpen(false);
          }}
        />
      </FormDialog>
    </>
  );
}
