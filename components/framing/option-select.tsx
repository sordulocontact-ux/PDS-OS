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
}: {
  id: string;
  label: string;
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
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
        className="min-w-44"
      >
        <SelectValue />
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
