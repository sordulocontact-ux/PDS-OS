"use client";

import { Combobox } from "@base-ui/react/combobox";
import {
  IconCheck,
  IconChevronDown,
  IconMagnifier,
} from "nucleo-sharp-essential";
import { useMemo } from "react";

import { selectTriggerClassName } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

// Accents and case forgotten: « hebergement » finds « Hébergement ».
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * A menu of a form with many choices (the 16 postes of a budget line,
 * retour du 09/11/2026): the same closed box as `OptionSelect`, and once
 * open, a search field on top, focused at once, the choices below narrowed
 * as one types (« restau » leaves « Restauration »). ↑ ↓ move, Entrée
 * chooses, Échap closes. `fill`: as wide as its column, as every field of a
 * form (docs/DESIGN.md « Largeur d'un champ »).
 */
export function SearchSelect({
  id,
  label,
  options,
  value,
  onChange,
  searchPlaceholder,
  emptyLabel,
  disabled,
  required = false,
  fill = false,
  placeholder,
  invalid = false,
  describedBy,
}: {
  id: string;
  label: string;
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  required?: boolean;
  fill?: boolean;
  // Said in the closed box while nothing is chosen.
  placeholder?: string;
  // A required choice missing after a first try (docs/DESIGN.md « Manques à
  // la validation »): red box, its FieldError named by `describedBy`.
  invalid?: boolean;
  describedBy?: string;
}) {
  const items = useMemo<Option[]>(
    () => Object.entries(options).map(([key, text]) => ({ value: key, label: text })),
    [options],
  );
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox.Root
      items={items}
      value={selected}
      onValueChange={(next) => next && onChange(next.value)}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(item, current) => item.value === current.value}
      filter={(item, query) => fold(item.label).includes(fold(query))}
      autoHighlight
      disabled={disabled}
    >
      <Combobox.Trigger
        id={id}
        // The height of SelectTrigger's default size (h-8): the same box.
        data-size="default"
        aria-label={label}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          selectTriggerClassName,
          fill ? "w-full min-w-0" : "max-w-full min-w-44",
        )}
      >
        <span className="block min-w-0 flex-1 truncate text-left">
          {selected || !placeholder ? (
            <Combobox.Value />
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <IconChevronDown
          aria-hidden
          className="pointer-events-none size-4 text-muted-foreground"
        />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup
            className={cn(
              "flex max-h-[min(var(--available-height),22rem)] w-(--anchor-width) min-w-56 flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
              "origin-(--transform-origin) transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)] data-ending-style:opacity-0 data-ending-style:duration-[var(--duration-instant)] data-starting-style:opacity-0 motion-safe:transition-[opacity,scale] motion-safe:data-starting-style:scale-[.97]",
            )}
          >
            <div className="relative shrink-0 border-b border-[color:var(--border-hairline)]">
              <IconMagnifier
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[color:var(--text-secondary)]"
              />
              <Combobox.Input
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-10 w-full bg-transparent pr-3 pl-9 text-[length:var(--type-body-md)] font-medium outline-none placeholder:text-[color:var(--text-tertiary)]"
              />
            </div>
            <Combobox.Empty className="px-3 py-2.5 text-[length:var(--type-caption)] text-[color:var(--text-tertiary)] empty:hidden">
              {emptyLabel}
            </Combobox.Empty>
            <Combobox.List className="min-h-0 flex-1 overflow-y-auto p-1 empty:hidden">
              {(item: Option) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <span className="min-w-0 flex-1 break-words">
                    {item.label}
                  </span>
                  <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <IconCheck className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
