"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import {
  formFieldControlClassName,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CommonProps = {
  id?: string;
  name: string;
  label: string;
  // Each value and its displayed label, in the order they are listed.
  items: Record<string, string>;
  placeholder?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  // Shows the « * » after the label (docs/DESIGN.md § 4).
  required?: boolean;
  // On the root column (a wider gap under the label in an inline form).
  className?: string;
};

type SingleProps = CommonProps & {
  multiple?: false;
  defaultValue?: string | null;
  // Optional: lets the form react to the choice; the value is still submitted.
  onValueChange?: (value: string) => void;
  // A gesture at the end of the list, after a rule (« + Nouveau modèle de
  // contrat », Sacha 26/11/2026: what is missing is made from the menu
  // itself): it opens what makes the missing choice, it is never a value.
  action?: { label: string; onSelect: () => void };
};

// The value of the action's line, never submitted.
const ACTION = "__action__";

// Several choices in one menu (a contact's roles): submitted as a JSON array
// under `name`, like ChipMultiChoice, so the server reads either the same way.
type MultipleProps = CommonProps & {
  multiple: true;
  defaultValue?: string[];
  // Controlled: the form fills the choices itself (a credit's roles taken
  // from the person picked).
  value?: string[];
  onValueChange?: (value: string[]) => void;
  // Past this many, the other choices are disabled (the database's limit).
  max?: number;
};

// Labelled select submitting its value under `name`: one choice, or several
// with `multiple` (the menu stays open while ticking, the trigger lists them).
export function OptionSelect(props: SingleProps | MultipleProps) {
  const {
    id: idProp,
    name,
    label,
    hint,
    error,
    hideLabel = false,
    required = false,
    className,
  } = props;
  const id = idProp ?? `${name}-select`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const trigger = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
    className: cn("w-full", formFieldControlClassName),
  } as const;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label
        htmlFor={id}
        required={required}
        className={hideLabel ? "sr-only" : undefined}
      >
        {label}
      </Label>
      {props.multiple ? (
        <MultipleSelect {...props} trigger={trigger} />
      ) : (
        <SingleSelect
          // Same reason as Field: remount when the server sends another default.
          key={props.defaultValue ?? ""}
          {...props}
          trigger={trigger}
        />
      )}
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

function SingleSelect({
  name,
  items,
  defaultValue,
  onValueChange,
  placeholder,
  action,
  trigger,
}: SingleProps & {
  trigger: React.ComponentProps<typeof SelectTrigger>;
}) {
  // Held here so the action's line never becomes the value.
  const [value, setValue] = useState<string | null>(defaultValue ?? null);
  return (
    <Select
      name={name}
      items={action ? { ...items, [ACTION]: action.label } : items}
      value={value}
      onValueChange={(next) => {
        if (typeof next !== "string") return;
        if (next === ACTION) return action?.onSelect();
        setValue(next);
        onValueChange?.(next);
      }}
    >
      <SelectTrigger {...trigger}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([itemValue, itemLabel]) => (
          <SelectItem key={itemValue} value={itemValue}>
            {itemLabel}
          </SelectItem>
        ))}
        {action && (
          <>
            {Object.keys(items).length > 0 && <SelectSeparator />}
            <SelectItem value={ACTION}>
              <IconPlus aria-hidden className="size-3.5 shrink-0" />
              {action.label}
            </SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

function MultipleSelect({
  name,
  items,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  max,
  trigger,
}: MultipleProps & {
  trigger: React.ComponentProps<typeof SelectTrigger>;
}) {
  const [own, setOwn] = useState<string[]>(defaultValue ?? []);
  const selected = value ?? own;
  const setSelected = (next: string[]) => {
    setOwn(next);
    onValueChange?.(next);
  };
  const order = Object.keys(items);
  // Listed in the menu's order, whatever the order they were ticked in.
  const summary = order
    .filter((value) => selected.includes(value))
    .map((value) => items[value])
    .join(", ");
  const full = max !== undefined && selected.length >= max;

  return (
    <>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
      <Select
        multiple
        items={items}
        value={selected}
        onValueChange={(next) =>
          setSelected(Array.isArray(next) ? next.map(String) : [])
        }
      >
        <SelectTrigger {...trigger}>
          <SelectValue>
            {() =>
              summary || (
                <span className="text-muted-foreground">{placeholder}</span>
              )
            }
          </SelectValue>
        </SelectTrigger>
        {/* Under the trigger rather than over it: the list is ticked
            several times, the trigger keeps showing the choices. */}
        <SelectContent alignItemWithTrigger={false}>
          {Object.entries(items).map(([value, itemLabel]) => (
            <SelectItem
              key={value}
              value={value}
              indicator="checkbox"
              disabled={full && !selected.includes(value)}
            >
              {itemLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
