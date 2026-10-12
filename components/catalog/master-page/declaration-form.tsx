"use client";

import { useEffect, useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import {
  DECLARATION_STATUSES,
  type MasterDeclaration,
  type Organism,
} from "@/lib/catalog/master/rules";
import {
  listDeclarationProofs,
  saveDeclaration,
} from "@/lib/catalog/master/rights-actions";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";

export function DeclarationForm({
  masterId,
  organism,
  declaration,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  organism: Organism;
  declaration: MasterDeclaration | null;
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.declarations;
  // The title's files, read at opening, to choose the proof (retour 60).
  const [files, setFiles] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    let active = true;
    listDeclarationProofs(masterId).then((list) => {
      if (active) setFiles(list);
    });
    return () => {
      active = false;
    };
  }, [masterId]);
  // The final list (retour 63): « À effectuer » is a real status.
  const statuses = Object.fromEntries(
    DECLARATION_STATUSES.map((status) => [status, t.statuses[status]]),
  );
  return (
    <MasterForm
      action={saveDeclaration}
      defaults={defaults}
      hidden={{ masterId, organism }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          <OptionSelect
            name="status"
            label={t.fields.status}
            required
            items={statuses}
            defaultValue={value("status", declaration?.status ?? "to_do")}
            error={error("status")}
          />
          <Field
            name="thirdParty"
            label={t.fields.thirdParty}
            hint={t.fields.thirdPartyHint}
            autoComplete="off"
            maxLength={200}
            defaultValue={value("thirdParty", declaration?.thirdParty)}
            error={error("thirdParty")}
          />
          <Field
            name="reference"
            label={t.fields.reference}
            autoComplete="off"
            maxLength={100}
            defaultValue={value("reference", declaration?.reference)}
            error={error("reference")}
          />
          <Field
            name="date"
            type="date"
            label={t.fields.date}
            defaultValue={value("date", declaration?.date)}
            error={error("date")}
          />
          <OptionSelect
            name="proofFileId"
            label={t.fields.proof}
            hint={t.fields.proofHint}
            items={{
              none: t.fields.noProof,
              ...Object.fromEntries(files.map((f) => [f.id, f.name])),
            }}
            defaultValue={value(
              "proofFileId",
              declaration?.proofFileId ?? "none",
            )}
            error={error("proofFileId")}
          />
          <TextareaField
            name="notes"
            label={t.fields.notes}
            rows={3}
            maxLength={2000}
            defaultValue={value("notes", declaration?.notes)}
            error={error("notes")}
          />
        </>
      )}
    </MasterForm>
  );
}
