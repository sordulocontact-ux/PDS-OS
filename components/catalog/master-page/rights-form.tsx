"use client";

import { Field } from "@/components/auth/field";
import { formatIswc, type MasterRights } from "@/lib/catalog/master/rules";
import { saveMasterRights } from "@/lib/catalog/master/rights-actions";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";

/** ISWC of the work, holder and year of the ℗: the title's Droits tab and
 * the Juridique's Titres. */
export function RightsForm({
  masterId,
  rights,
  onDone,
}: {
  masterId: string;
  rights: MasterRights;
  onDone: () => void;
}) {
  const t = fr.masterPage.rights;
  return (
    <MasterForm action={saveMasterRights} hidden={{ masterId }} onDone={onDone}>
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
  );
}
