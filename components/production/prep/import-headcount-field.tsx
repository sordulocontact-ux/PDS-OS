"use client";

import { FieldError } from "@/components/auth/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import { MAX_HEADCOUNT } from "@/lib/production/roles";

/** The number of people of an imported need: the person's, 1 by default,
 * never proposed by PO. Red with its reason after a wrong « Appliquer ». */
export function ImportHeadcountField({
  id,
  value,
  invalid,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  invalid: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <Label htmlFor={id} required>
        {fr.productionNeeds.fields.headcount}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_HEADCOUNT}
        required
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className="w-28"
      />
      <FieldError id={errorId}>
        {invalid
          ? fr.productionImport.errors.headcount(MAX_HEADCOUNT)
          : undefined}
      </FieldError>
    </div>
  );
}
