"use client";

import { FieldError } from "@/components/auth/form-message";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type {
  Creator,
  PhonoSplit,
  Publisher,
} from "@/lib/legal/formalities/definition";
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
  hint,
  value,
  creators,
  publishers,
  split,
  errors,
  onChange,
}: {
  id: string;
  label: string;
  // Its note, unless the row already says where it stands.
  hint?: string;
  value: DepDr;
  creators: Creator[];
  publishers: Publisher[];
  split: PhonoSplit;
  errors: DossierErrors | null;
  onChange: (value: DepDr) => void;
}) {
  const t = fr.legalFormalities;
  return (
    // 12 px around the preview's card (Sacha, 10/11/2026: « la carte
    // au-dessus et le texte vérifié les parts sont un peu trop collés »).
    <div className="flex flex-col gap-3">
      {/* Two choices: side by side, the chosen one's background
          sliding (Sacha, 09/11/2026). */}
      <div className="flex flex-col gap-1.5">
        <SegmentedControl
          aria-label={label}
          fill
          options={Object.entries(t.depDrSegments).map(([v, l]) => ({
            value: v,
            label: l,
          }))}
          value={value.choice || null}
          onChange={(v) =>
            v &&
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
        {errors?.fields.dep_dr ? (
          <FieldError id={`${id}-dep-dr-error`}>
            {errors.fields.dep_dr}
          </FieldError>
        ) : (
          hint && <p className="text-body-sm text-muted-foreground">{hint}</p>
        )}
      </div>
      <DepDrPreview
        creators={creators}
        publishers={publishers}
        split={split}
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
    </div>
  );
}
