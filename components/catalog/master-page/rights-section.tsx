"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  formatIswc,
  pLine,
  type MasterRights,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { RightsForm } from "./rights-form";

// Rights on the master: ISWC of the work, holder and year of the ℗.
export function RightsSection({
  masterId,
  rights,
  canEdit,
}: {
  masterId: string;
  rights: MasterRights;
  canEdit: boolean;
}) {
  const t = fr.masterPage.rights;
  const [open, setOpen] = useState(false);

  return (
    <PageSection
      card
      id="rights"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <IconPenWriting2 aria-hidden data-icon="inline-start" />
            {t.edit}
          </Button>
        )
      }
    >
      <FactList
        emptyLabel={fr.catalog.notProvided}
        facts={[
          {
            label: t.fields.iswc,
            value: rights.iswc ? formatIswc(rights.iswc) : null,
            valueClassName: "font-mono",
          },
          { label: t.fields.rightsHolder, value: rights.rightsHolder },
          {
            label: t.fields.rightsYear,
            value: rights.rightsYear?.toString() ?? null,
            valueClassName: "tabular-nums",
          },
          { label: t.pLine, value: pLine(rights) },
        ]}
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.editTitle}
        description={t.formDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <RightsForm
          masterId={masterId}
          rights={rights}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </PageSection>
  );
}
