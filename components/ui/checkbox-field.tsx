"use client";

import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";

/** A checkbox with its label and an optional hint under it, the whole line
 * clickable. Uncontrolled (`defaultChecked`, submitted under `name`) or
 * controlled (`checked` + `onChange`). */
export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
  checked,
  onChange,
  disabled,
}: {
  name?: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  // Shown ticked but fixed (a reserve that may not be left out).
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <Checkbox
        id={id}
        name={name}
        size="md"
        className="mt-0.5"
        defaultChecked={defaultChecked}
        checked={checked}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}
