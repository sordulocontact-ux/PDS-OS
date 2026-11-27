"use client";

import { IconFilter } from "nucleo-sharp-essential";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CountBadge } from "@/components/ui/count-badge";
import {
  optionsWithValues,
  type FilterControl,
} from "@/components/ui/filter-control";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { core } from "@/lib/i18n/fr/core";

const fr = { urlFilters: core.urlFilters };

// The "no filter" segment of a one-choice axis (Actifs / Archivés).
const ALL = "all";

/**
 * Every axis of a list behind one « Filtres » button (more than 3 axes,
 * Sacha 24/11/2026, after Accordee): a panel with a group of boxes per axis,
 * several ticked at once (any of them within an axis, every axis at once).
 * A one-choice axis (`menuOnly`) stays one choice, as segments. The panel
 * stays open while one ticks; the count of what is ticked on the button.
 */
export function FilterPanel({
  filters,
  align = "end",
}: {
  filters: FilterControl[];
  // « start » when the button opens a row (no search before it).
  align?: "start" | "end";
}) {
  const t = fr.urlFilters;
  const count = filters.reduce((sum, filter) => sum + filter.values.length, 0);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label={count > 0 ? t.panelCount(count) : undefined}
            className="shrink-0 border-input bg-[var(--control-bg)]"
          >
            <IconFilter aria-hidden data-icon="inline-start" />
            {t.panel}
            {count > 0 && <CountBadge count={count} />}
          </Button>
        }
      />
      <PopoverContent
        align={align}
        aria-label={t.panel}
        className="w-[min(20rem,calc(100vw-2rem))]"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {filters.map((filter) => (
            <FilterGroup key={filter.key} filter={filter} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// One axis: its name, then a box per option (or the segments of a
// one-choice axis); a hairline between two axes.
function FilterGroup({ filter }: { filter: FilterControl }) {
  const labelId = useId();
  const toggle = (value: string, checked: boolean) =>
    filter.onChange(
      checked
        ? [...filter.values.filter((v) => v !== value), value]
        : filter.values.filter((v) => v !== value),
    );

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-0.5 border-t border-[color:var(--border-hairline)] p-2 first:border-t-0"
    >
      <p
        id={labelId}
        className="px-2 pt-1 pb-1.5 text-caption text-[color:var(--text-secondary)]"
      >
        {filter.label}
      </p>
      {filter.menuOnly ? (
        <SegmentedControl
          fill
          aria-labelledby={labelId}
          options={[
            { value: ALL, label: filter.allLabel },
            ...filter.options.map((option) => ({
              value: option.value,
              label: option.label,
            })),
          ]}
          value={filter.values[0] ?? ALL}
          onChange={(next) =>
            filter.onChange(next === null || next === ALL ? [] : [next])
          }
        />
      ) : (
        optionsWithValues(filter).map((option) => (
          <label
            key={option.value}
            className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-[length:var(--type-body-md)] font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]"
          >
            <Checkbox
              checked={filter.values.includes(option.value)}
              onChange={(event) => toggle(option.value, event.target.checked)}
            />
            <span className="min-w-0 flex-1 truncate" title={option.label}>
              {option.label}
            </span>
          </label>
        ))
      )}
    </div>
  );
}
