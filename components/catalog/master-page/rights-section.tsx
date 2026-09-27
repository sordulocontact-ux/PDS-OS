"use client";

import { IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  formatIswc,
  pLine,
  type MasterRights,
} from "@/lib/catalog/master/rules";
import { saveMasterRights } from "@/lib/catalog/master/rights-actions";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";

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
        <MasterForm
          action={saveMasterRights}
          hidden={{ masterId }}
          onDone={() => setOpen(false)}
        >
          {({ value, error }) => (
            <>
              <Field
                name="iswc"
                label={t.fields.iswc}
                hint={t.fields.iswcHint}
                autoFocus
                autoComplete="off"
                maxLength={20}
                className="h-10 font-mono text-base md:text-sm"
                defaultValue={value(
                  "iswc",
                  rights.iswc ? formatIswc(rights.iswc) : null,
                )}
                error={error("iswc")}
              />
              <Field
                name="rightsHolder"
                label={t.fields.rightsHolder}
                hint={t.fields.rightsHolderHint}
                autoComplete="off"
                maxLength={200}
                defaultValue={value("rightsHolder", rights.rightsHolder)}
                error={error("rightsHolder")}
              />
              <Field
                name="rightsYear"
                label={t.fields.rightsYear}
                hint={t.fields.rightsYearHint}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                defaultValue={value("rightsYear", rights.rightsYear)}
                error={error("rightsYear")}
              />
            </>
          )}
        </MasterForm>
      </FormDialog>
    </PageSection>
  );
}
