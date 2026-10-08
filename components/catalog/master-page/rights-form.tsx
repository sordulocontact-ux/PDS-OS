"use client";

import { useEffect, useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { formatIswc, type MasterRights } from "@/lib/catalog/master/rules";
import { saveMasterRights } from "@/lib/catalog/master/rights-actions";
import { suggestRightsHolder } from "@/lib/catalog/master/rights-holder-actions";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";

/** ISWC of the work, holder and year of the ℗: the title's Droits tab and
 * the Juridique's Titres. */
export function RightsForm({
  masterId,
  rights,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  rights: MasterRights;
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.rights;
  return (
    <MasterForm
      action={saveMasterRights}
      defaults={defaults}
      hidden={{ masterId }}
      onDone={onDone}
      onCancel={onCancel}
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
          <RightsHolderField
            masterId={masterId}
            initial={value("rightsHolder", rights.rightsHolder)}
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

/**
 * The holder of the ℗, a name (masters.rights_holder is text, no contact
 * id). Left empty, it is filled with the label of the title's master split,
 * else its producer (Sacha, 07/10/2026: what PDS knows is filled in), said
 * under the field, and stays editable.
 */
function RightsHolderField({
  masterId,
  initial,
  error,
}: {
  masterId: string;
  initial: string;
  error?: string;
}) {
  const t = fr.masterPage.rights.fields;
  const [holder, setHolder] = useState(initial);
  const [proposed, setProposed] = useState<{
    name: string;
    role: "label" | "producer";
  } | null>(null);
  const typed = useRef(false);

  useEffect(() => {
    if (initial) return;
    let live = true;
    suggestRightsHolder(masterId).then((suggestion) => {
      if (!live || !suggestion || typed.current) return;
      setHolder(suggestion.name);
      setProposed(suggestion);
    });
    return () => {
      live = false;
    };
  }, [masterId, initial]);

  return (
    <Field
      name="rightsHolder"
      label={t.rightsHolder}
      hint={
        proposed && holder === proposed.name
          ? t.rightsHolderSuggested(proposed.role)
          : t.rightsHolderHint
      }
      autoComplete="off"
      maxLength={200}
      value={holder}
      onChange={(event) => {
        typed.current = true;
        setHolder(event.target.value);
      }}
      error={error}
    />
  );
}
