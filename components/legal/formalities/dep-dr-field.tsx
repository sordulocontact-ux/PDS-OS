"use client";

import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import type { DossierErrors } from "@/lib/legal/formalities/field-errors";
import { CURRENT_SHARING_RULE } from "@/lib/legal/formalities/sharing-rule";

import { DepDrPreview } from "./dep-dr-preview";

const fr = { legalFormalities };

export type DepDr = { choice?: string; rule?: string; checked?: boolean };

/** « 4. Répartition » of the bulletin (JUR-02): what DEP and DR are, the
 * rubrique D, the shares the code computes from it, and « J'ai vérifié les
 * parts DEP et DR » — required before the version to sign. */
export function DepDrField({
  id,
  label,
  value,
  creators,
  publishers,
  errors,
  onChange,
}: {
  id: string;
  label: string;
  value: DepDr;
  creators: Creator[];
  publishers: Publisher[];
  errors: DossierErrors | null;
  onChange: (value: DepDr) => void;
}) {
  const t = fr.legalFormalities;
  return (
    <>
      <p className="text-sm text-muted-foreground">{t.sharing.explain}</p>
      <OptionSelect
        name={`${id}-dep-dr`}
        label={label}
        required
        hint={t.notes.dep_dr}
        error={errors?.fields.dep_dr}
        items={t.depDrChoices}
        defaultValue={value.choice || null}
        onValueChange={(v) =>
          onChange({
            choice: v,
            // The rule the preview used is kept with the dossier: a later
            // rule never changes it (JUR-23).
            rule: value.rule ?? CURRENT_SHARING_RULE,
            // Another choice, other shares: checked again.
            checked: false,
          })
        }
      />
      <DepDrPreview
        creators={creators}
        publishers={publishers}
        choice={value.choice ?? ""}
        ruleId={value.rule ?? CURRENT_SHARING_RULE}
      />
      {value.choice && (
        <div className="flex flex-col gap-1">
          <CheckboxField
            label={t.sharing.check}
            checked={Boolean(value.checked)}
            onChange={(checked) => onChange({ ...value, checked })}
          />
          <FieldError id={`${id}-dep-dr-check-error`}>
            {errors?.fields.dep_dr_check}
          </FieldError>
        </div>
      )}
    </>
  );
}
