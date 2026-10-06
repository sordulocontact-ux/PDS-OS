"use client";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { fr } from "@/lib/i18n/fr";

type Arrangement = { scope: string; detail: string };
type Contract = { provided: boolean; rubric_g: string };

/** « Arrangement ← autorisation pour toutes les exploitations ou certaines
 * exploitations déterminées ». */
export function ArrangementField({
  id,
  label,
  disabled,
  value,
  onChange,
}: {
  id: string;
  label: string;
  disabled: boolean;
  value: Arrangement;
  onChange: (next: Arrangement) => void;
}) {
  const t = fr.legalFormalities;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <OptionSelect
        name={`${id}-arrangement`}
        label={label}
        items={{
          all: t.arrangementScopes.all,
          specific: t.arrangementScopes.specific,
        }}
        defaultValue={value.scope || null}
        onValueChange={(scope) => onChange({ ...value, scope })}
      />
      {value.scope === "specific" && (
        <Field
          name={`${id}-arrangement-detail`}
          label={t.arrangementScopes.specific}
          value={value.detail}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, detail: e.target.value })}
        />
      )}
    </div>
  );
}

/** « Le contrat d'édition est optionnel sauf si seuls les éditeurs signent ;
 * sans copie, renseigner la rubrique G ». */
export function ContractField({
  id,
  disabled,
  value,
  onChange,
}: {
  id: string;
  disabled: boolean;
  value: Contract;
  onChange: (next: Contract) => void;
}) {
  const t = fr.legalFormalities.contract;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          className="size-4 accent-selection"
          disabled={disabled}
          checked={value.provided}
          onChange={(e) => onChange({ ...value, provided: e.target.checked })}
        />
        {t.provided}
      </label>
      {!value.provided && (
        <TextareaField
          name={`${id}-rubric-g`}
          label={t.rubricG}
          rows={2}
          disabled={disabled}
          value={value.rubric_g}
          onChange={(e) => onChange({ ...value, rubric_g: e.target.value })}
        />
      )}
    </div>
  );
}
