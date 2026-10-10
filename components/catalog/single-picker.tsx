"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useId, useMemo } from "react";

import { FieldError } from "@/components/auth/form-message";
import {
  SearchPicker,
  type PickerOption,
} from "@/components/catalog/search-picker";
import { Button } from "@/components/ui/button";
import { RequiredMark } from "@/components/ui/required-mark";

/**
 * One item picked from a list with search (a content format, the artist of
 * a content): the search field until something is chosen, then the chosen
 * row with a ✕. Controlled by the parent, which also opens the "create"
 * modal; submitted under `name` through a hidden input.
 */
export function SinglePicker({
  name,
  legend,
  required = false,
  options,
  selectedId,
  onSelect,
  searchLabel,
  placeholder,
  onCreate,
  createLabel,
  noResultLabel,
  allSelectedLabel,
  suggestedIds,
  noSuggestionLabel,
  removeLabel,
  error,
}: {
  name: string;
  legend: string;
  // Shows the « * » after the legend (docs/DESIGN.md § 4).
  required?: boolean;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchLabel: string;
  placeholder: string;
  onCreate: (query: string) => void;
  createLabel: (query: string) => string;
  noResultLabel: (query: string) => string;
  allSelectedLabel: string;
  suggestedIds?: ReadonlySet<string>;
  noSuggestionLabel?: string;
  removeLabel: (label: string) => string;
  error?: string;
}) {
  const id = useId();
  const selected = options.find((o) => o.id === selectedId) ?? null;
  const excluded = useMemo(() => new Set<string>(), []);

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="flex flex-col gap-1.5"
    >
      <span id={`${id}-label`} className="text-sm leading-none font-medium">
        {legend}
        {required && <RequiredMark announce />}
      </span>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-border py-1.5 pr-1.5 pl-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {selected.label}
            </span>
            {selected.detail && (
              <span className="text-xs text-muted-foreground">
                {selected.detail}
              </span>
            )}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onSelect(null)}
            aria-label={removeLabel(selected.label)}
          >
            <IconXmark aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="pt-1">
          <SearchPicker
            label={searchLabel}
            placeholder={placeholder}
            options={options}
            excludedIds={excluded}
            onPick={onSelect}
            onCreate={onCreate}
            createLabel={createLabel}
            noResultLabel={noResultLabel}
            allSelectedLabel={allSelectedLabel}
            suggestedIds={suggestedIds}
            noSuggestionLabel={noSuggestionLabel}
            invalid={Boolean(error)}
            describedBy={error ? `${id}-error` : undefined}
          />
        </div>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
