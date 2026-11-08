"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The shadcn Select for a plain { value: label } list. `required`: said to
 * screen readers; the « * » is on the caller's Label.
 */
export function OptionSelect({
  id,
  label,
  options,
  value,
  onChange,
  disabled,
  required = false,
  fill = false,
}: {
  id: string;
  label: string;
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  // In a form: as wide as its column, like the other fields (Sacha
  // 07/11/2026); without it, as wide as its value (a row, a filter).
  fill?: boolean;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => typeof next === "string" && onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        aria-required={required || undefined}
        // A long option never runs past its column (Sacha 07/11/2026: the
        // Dispositif's lever over « Quantité »): cut with an ellipsis.
        className={fill ? "w-full min-w-0" : "max-w-full min-w-44"}
      >
        <SelectValue className="block! min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([key, text]) => (
          <SelectItem key={key} value={key}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
