"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  AGENCY_FIELDS,
  type AgencyField,
} from "@/lib/activations/agency/fields";
import { saveAgencyMapping } from "@/lib/activations/agency/source-actions";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationWork, activationAgency };

const t = fr.activationAgency;
const NONE = "none";

/** The columns' correspondence : one header per field (or none), and the
 * fields that identify a row. Proposed by code, confirmed here. */
export function MappingForm({
  projectId,
  sourceId,
  press,
  headers,
  mapping,
  keyFields,
  onSaved,
  onCancel,
}: {
  projectId: string;
  sourceId: string;
  press: boolean;
  headers: string[];
  mapping: Record<string, string>;
  keyFields: string[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const fields: readonly AgencyField[] =
    AGENCY_FIELDS[press ? "press" : "influence"];
  const [keys, setKeys] = useState<string[]>(keyFields);
  const { pending, error, run } = useWriteSubmit(
    onSaved,
    t.sources.mappingSaved,
  );
  const items = {
    [NONE]: t.sources.none,
    ...Object.fromEntries(headers.map((h) => [h, h])),
  };
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next = Object.fromEntries(
          fields
            .map((f) => [f, String(data.get(f) ?? NONE)])
            .filter(([, h]) => h !== NONE),
        );
        run(() =>
          saveAgencyMapping({
            projectId,
            sourceId,
            mapping: next,
            keyFields: keys as AgencyField[],
          }),
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <OptionSelect
            key={f}
            name={f}
            label={t.fieldLabels[f]}
            items={items}
            defaultValue={
              mapping[f] && headers.includes(mapping[f]) ? mapping[f] : NONE
            }
          />
        ))}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          {t.sources.keyFields}
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {fields.map((f) => (
            <CheckboxField
              key={f}
              label={t.fieldLabels[f]}
              checked={keys.includes(f)}
              onChange={(on) =>
                setKeys((k) =>
                  on ? [...k, f].slice(0, 4) : k.filter((x) => x !== f),
                )
              }
            />
          ))}
        </div>
      </fieldset>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : fr.activationWork.sheet.save}
        </Button>
      </div>
    </form>
  );
}
