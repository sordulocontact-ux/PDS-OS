"use client";

import { Field } from "@/components/auth/field";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/** The field's name: read by the form at submit, never by saveContract. */
export const SIGNED_ON_FIELD = "alreadySignedOn";

/**
 * « Déjà signé » of a dropped contract (Sacha 26/11/2026): ticked, its
 * signature day, filled from the document (« Fait à Paris, le … »); the
 * contract then enters as signed. Never ticked by the code: being signed is
 * said by whoever drops it.
 */
export function AlreadySignedField({
  checked,
  onChecked,
  signedOn,
  error,
}: {
  checked: boolean;
  onChecked: (checked: boolean) => void;
  // Read from the document, corrigible.
  signedOn: string | null;
  error: string | null;
}) {
  const t = fr.contracts.creation;
  return (
    <div className="flex flex-col gap-4">
      <CheckboxField
        label={t.alreadySigned}
        checked={checked}
        onChange={onChecked}
      />
      {checked && (
        <Field
          name={SIGNED_ON_FIELD}
          type="date"
          label={t.signedOn}
          required
          defaultValue={signedOn ?? ""}
          error={error ?? undefined}
          className="h-10 text-base md:text-sm"
        />
      )}
    </div>
  );
}
