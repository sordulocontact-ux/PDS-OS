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
import { cn } from "@/lib/utils";

/**
 * One item picked from a list with search (a content format, the artist of
 * a content): the search field until something is chosen, then the chosen
 * row with a ✕. Controlled by the parent, which also opens the "create"
 * modal; submitted under `name` through a hidden input.
 */
export function SinglePicker({
  name,
  legend,
  hideLegend = false,
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
  onQueryChange,
  keepName,
  uniqueLabels,
}: {
  name: string;
  legend: string;
  // Read by screen readers only (a title above already says it).
  hideLegend?: boolean;
  // Shows the « * » after the legend (docs/DESIGN.md § 4).
  required?: boolean;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  searchLabel: string;
  placeholder: string;
  // Without it, no « create » row: only picked (a selection of artists).
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  noResultLabel: (query: string) => string;
  allSelectedLabel: string;
  suggestedIds?: ReadonlySet<string>;
  noSuggestionLabel?: string;
  removeLabel: (label: string) => string;
  error?: string;
  onQueryChange?: (query: string) => void;
  keepName?: React.ComponentProps<typeof SearchPicker>["keepName"];
  // No « create » row for a name already among the options (artists).
  uniqueLabels?: boolean;
}) {
  const id = useId();
  const selected = options.find((o) => o.id === selectedId) ?? null;
  const excluded = useMemo(() => new Set<string>(), []);

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      // A chosen value refused: the reason read with the group (the search
      // carries it otherwise).
      aria-describedby={selected && error ? `${id}-error` : undefined}
      className="flex flex-col gap-1.5"
    >
      <span
        id={`${id}-label`}
        className={cn(
          "text-sm leading-none font-medium",
          hideLegend && "sr-only",
        )}
      >
        {legend}
        {required && <RequiredMark announce />}
      </span>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border bg-card py-1.5 pr-1.5 pl-3",
            error ? "border-error" : "border-border",
            !hideLegend && "mt-1",
          )}
        >
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
        <div className={cn(!hideLegend && "pt-1")}>
          <SearchPicker
            label={searchLabel}
            placeholder={placeholder}
            options={options}
            excludedIds={excluded}
            onPick={onSelect}
            onCreate={onCreate}
            createLabel={createLabel}
            uniqueLabels={uniqueLabels}
            noResultLabel={noResultLabel}
            allSelectedLabel={allSelectedLabel}
            suggestedIds={suggestedIds}
            noSuggestionLabel={noSuggestionLabel}
            invalid={Boolean(error)}
            describedBy={error ? `${id}-error` : undefined}
            onQueryChange={onQueryChange}
            keepName={keepName}
          />
        </div>
      )}
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
