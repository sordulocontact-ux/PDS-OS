"use client";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { SegmentedControl } from "@/components/ui/segmented-control";
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
    // The exploitations named under the choice, when some only.
    <div className="flex flex-col gap-2">
      {/* Two choices: side by side (Sacha, 09/11/2026). */}
      <fieldset disabled={disabled} className="flex flex-col gap-1.5">
        <SegmentedControl
          aria-label={label}
          fill
          options={Object.entries(t.arrangementSegments).map(([v, l]) => ({
            value: v,
            label: l,
          }))}
          value={value.scope || null}
          // Optional unless a participant arranged: it can be undone.
          deselectable={!required}
          onChange={(scope) => onChange({ ...value, scope: scope ?? "" })}
        />
        <FieldError id={`${id}-arrangement-error`}>{error}</FieldError>
      </fieldset>
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
      <p className="text-body-sm">
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
