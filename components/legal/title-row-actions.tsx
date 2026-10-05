"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MasterEditForm } from "@/components/catalog/master-edit-form";
import { RightsForm } from "@/components/catalog/master-page/rights-form";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions } from "@/components/ui/row-actions";
import type { MasterRights } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

/**
 * "⋯" of a title in the État des lieux: edit the title itself (ISRC,
 * credits…) or its rights (ISWC, ℗), with the forms of the title's pages.
 */
export function TitleRowActions({
  masterId,
  title,
  rights,
}: {
  masterId: string;
  title: string;
  rights: MasterRights;
}) {
  const router = useRouter();
  const l = fr.legal.inventory.actions;
  const [open, setOpen] = useState<"title" | "rights" | null>(null);
  const done = () => {
    setOpen(null);
    router.refresh();
  };

  return (
    <>
      <RowActions
        label={fr.records.menu.label(title)}
        actions={[
          {
            key: "title",
            label: l.editTitle,
            icon: IconPenWriting2,
            onSelect: () => setOpen("title"),
          },
          {
            key: "rights",
            label: l.editRights,
            icon: IconPenWriting2,
            onSelect: () => setOpen("rights"),
          },
        ]}
      />
      <FormDialog
        open={open === "title"}
        onOpenChange={(next) => !next && setOpen(null)}
        title={fr.records.edit.title.master}
        description={fr.records.edit.description.master}
        closeLabel={fr.records.edit.close}
      >
        <MasterEditForm
          masterId={masterId}
          onSaved={done}
          onCancel={() => setOpen(null)}
        />
      </FormDialog>
      <FormDialog
        open={open === "rights"}
        onOpenChange={(next) => !next && setOpen(null)}
        title={fr.masterPage.rights.editTitle}
        description={fr.masterPage.rights.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <RightsForm masterId={masterId} rights={rights} onDone={done} />
      </FormDialog>
    </>
  );
}
