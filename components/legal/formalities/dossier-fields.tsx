"use client";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";

const fr = { legalFormalities };

type Arrangement = { scope: string; detail: string };
type Contract = { provided: boolean; rubric_g: string };

/** « Arrangement ← autorisation pour toutes les exploitations ou certaines
 * exploitations déterminées ». */
export function ArrangementField({
  id,
  label,
  required = false,
  disabled,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  disabled: boolean;
  value: Arrangement;
  error?: string;
  onChange: (next: Arrangement) => void;
}) {
  const t = fr.legalFormalities;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <OptionSelect
        name={`${id}-arrangement`}
        label={label}
        hideLabel
        required={required}
        items={{
          all: t.arrangementScopes.all,
          specific: t.arrangementScopes.specific,
        }}
        defaultValue={value.scope || null}
        error={error}
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
  required = false,
  disabled,
  value,
  error,
  onChange,
}: {
  id: string;
  required?: boolean;
  disabled: boolean;
  value: Contract;
  error?: string;
  onChange: (next: Contract) => void;
}) {
  const t = fr.legalFormalities.contract;
  return (
    <div className="flex flex-col gap-2">
      {/* Derived from the publishers' contracts, never ticked by hand
          (JUR-25): a copy is joined only when there is a piece. */}
      <p className="text-sm font-medium">
        {value.provided ? t.providedYes : t.providedNo}
      </p>
      <FieldError id={`${id}-contract-error`}>{error}</FieldError>
      {!value.provided && (
        <Field
          type="date"
          name={`${id}-rubric-g`}
          label={t.rubricG}
          aria-required={required || undefined}
          hint={t.rubricGHint}
          disabled={disabled}
          value={value.rubric_g}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange({ ...value, rubric_g: e.target.value })}
        />
      )}
    </div>
  );
}
