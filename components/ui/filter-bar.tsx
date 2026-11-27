"use client";

import { IconFilter } from "nucleo-sharp-essential";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroupLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  optionsWithValues,
  type FilterControl,
} from "@/components/ui/filter-control";
import { FilterPanel } from "@/components/ui/filter-panel";
import { FIELD_CONTROL } from "@/components/ui/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

export type { FilterControl } from "@/components/ui/filter-control";

const fr = { urlFilters: core.urlFilters };

// "all" in a select: no filter on that axis.
const ALL = "all";

// Up to this many axes, one select each (one choice); beyond, every axis in
// the « Filtres » panel, several choices each (Sacha 24/11/2026).
const MAX_SELECTS = 3;

// Each control of the bar: as wide as its neighbours, on one line when
// there is room (Figma, page Projets 90:4972), stacked on a phone.
const CELL = "min-w-0 flex-[1_1_12rem]";

/**
 * The filters of a list page, beside its search (`ListToolbar`). Up to 3
 * axes: one select each (one choice), the one-choice axes (Actifs /
 * Archivés) behind the filter button. More than 3: one « Filtres » button
 * and its panel of boxes to tick (`FilterPanel`, several choices per axis).
 * Then « Effacer les filtres » once one is set. Only the axes the list holds
 * are offered.
 */
export function FilterBar({
  filters,
  onClear,
}: {
  filters: FilterControl[];
  onClear: () => void;
}) {
  const t = fr.urlFilters;
  const offered = filters.filter(
    (filter) => filter.options.length > 0 || filter.values.length > 0,
  );
  const selects = offered.filter((filter) => !filter.menuOnly);
  const more = offered.filter((filter) => filter.menuOnly);
  const active = offered.some((filter) => filter.values.length > 0);

  return (
    <>
      {selects.length > MAX_SELECTS ? (
        <FilterPanel filters={offered} />
      ) : (
        <>
          {selects.map((filter) => (
            <FilterSelect key={filter.key} filter={filter} />
          ))}
          {more.length > 0 && <FilterMenu filters={more} />}
        </>
      )}
      {active && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t.clear}
        </Button>
      )}
    </>
  );
}

// The one-choice axes beside the selects, behind the square filter button
// (the number of active ones on it).
function FilterMenu({ filters }: { filters: FilterControl[] }) {
  const t = fr.urlFilters;
  const active = filters.filter((filter) => filter.values.length > 0).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={active > 0 ? t.moreCount(active) : t.more}
            className="relative shrink-0 border-input bg-[var(--control-bg)]"
          >
            <IconFilter aria-hidden />
            {active > 0 && (
              <CountBadge
                count={active}
                size="sm"
                className="absolute -top-1 -right-1"
              />
            )}
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="max-h-[min(70vh,32rem)] overflow-y-auto"
      >
        {filters.map((filter, index) => (
          <div key={filter.key} className="flex flex-col">
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuRadioGroup
              value={filter.values[0] ?? ALL}
              onValueChange={(value: string) =>
                filter.onChange(value === ALL ? [] : [value])
              }
            >
              <DropdownMenuGroupLabel>{filter.label}</DropdownMenuGroupLabel>
              <DropdownMenuRadioItem value={ALL}>
                {filter.allLabel}
              </DropdownMenuRadioItem>
              {filter.options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// One axis, one choice: a choice replaces the other ones.
function FilterSelect({ filter }: { filter: FilterControl }) {
  const items: Record<string, string> = {
    [ALL]: filter.allLabel,
    ...Object.fromEntries(
      optionsWithValues(filter).map((o) => [o.value, o.label]),
    ),
  };
  return (
    <div className={CELL}>
      <Select
        items={items}
        value={filter.values[0] ?? ALL}
        onValueChange={(next) =>
          typeof next === "string" && filter.onChange(next === ALL ? [] : [next])
        }
      >
        <SelectTrigger
          aria-label={filter.label}
          className={cn(
            FIELD_CONTROL,
            "w-full px-3 data-[size=default]:h-[var(--density-control-h)]",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(items).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** One line under the tabs: the search, then the filters (`FilterBar`). */
export function ListToolbar({
  search,
  children,
}: {
  search: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Twice a filter's share: the search is the first way in. */}
      <div className="min-w-0 flex-[2_1_18rem]">{search}</div>
      {/* Its own fragment: filters drawn by the page's server component
          came in beside the search as a list child without a key (React's
          warning on Contrats and Deals, 25/11/2026). */}
      <Fragment>{children}</Fragment>
    </div>
  );
}
