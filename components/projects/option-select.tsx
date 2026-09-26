"use client";

import { FieldError } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Labelled single-choice select submitting its value under `name`.
// `items` maps each value to its displayed label.
export function OptionSelect({
  id: idProp,
  name,
  label,
  items,
  defaultValue,
  placeholder,
  hint,
  error,
  hideLabel = false,
  onValueChange,
}: {
  id?: string;
  name: string;
  label: string;
  items: Record<string, string>;
  defaultValue?: string | null;
  placeholder?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  // Optional: lets the form react to the choice; the value is still submitted.
  onValueChange?: (value: string) => void;
}) {
  const id = idProp ?? `${name}-select`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <Select
        // Same reason as Field: remount when the server sends another default.
        key={defaultValue ?? ""}
        name={name}
        items={items}
        defaultValue={defaultValue ?? null}
        onValueChange={(next) =>
          typeof next === "string" && onValueChange?.(next)
        }
      >
        <SelectTrigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="w-full text-base data-[size=default]:h-10 md:text-sm"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([value, itemLabel]) => (
            <SelectItem key={value} value={value}>
              {itemLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
