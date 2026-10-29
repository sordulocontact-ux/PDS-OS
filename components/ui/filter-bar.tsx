"use client";

import { IconFilter } from "nucleo-sharp-essential";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_CONTROL } from "@/components/ui/search-field";
import { core } from "@/lib/i18n/fr/core";
import { cn } from "@/lib/utils";

const fr = { urlFilters: core.urlFilters };

export type FilterControl = {
  key: string;
  label: string;
  // The "no filter" choice ("Tous les types").
  allLabel: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
};

// "all" in a select: no filter on that axis.
const ALL = "all";

// Each control of the bar: as wide as its neighbours, on one line when
// there is room (Figma, page Projets 90:4972), stacked on a phone.
const CELL = "min-w-0 flex-[1_1_12rem]";

/**
 * The filters of a list page, beside its search (`ListToolbar`): the first
 * `inline` ones as selects, the others behind the filter button ("filtres
 * avancés", with the number of active ones), then « Effacer les filtres »
 * once one is set. Only the axes the list holds are offered.
 */
export function FilterBar({
  filters,
  inline = 3,
  onClear,
}: {
  filters: FilterControl[];
  inline?: number;
  onClear: () => void;
}) {
  const t = fr.urlFilters;
  const offered = filters.filter(
    (filter) => filter.options.length > 0 || filter.value !== null,
  );
  const shown = offered.slice(0, inline);
  const more = offered.slice(inline);
  const activeMore = more.filter((filter) => filter.value !== null).length;
  const active = offered.some((filter) => filter.value !== null);

  return (
    <>
      {shown.map((filter) => (
        <FilterSelect key={filter.key} filter={filter} />
      ))}
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={activeMore > 0 ? t.moreCount(activeMore) : t.more}
                className="relative shrink-0 border-input bg-[var(--control-bg)]"
              >
                <IconFilter aria-hidden />
                {activeMore > 0 && (
                  <CountBadge
                    count={activeMore}
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
            {more.map((filter, index) => (
              <div key={filter.key} className="flex flex-col">
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuRadioGroup
                  value={filter.value ?? ALL}
                  onValueChange={(value: string) =>
                    filter.onChange(value === ALL ? null : value)
                  }
                >
                  <DropdownMenuGroupLabel>{filter.label}</DropdownMenuGroupLabel>
                  <DropdownMenuRadioItem value={ALL}>
                    {filter.allLabel}
                  </DropdownMenuRadioItem>
                  {filter.options.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {active && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t.clear}
        </Button>
      )}
    </>
  );
}

function FilterSelect({ filter }: { filter: FilterControl }) {
  // A value the list no longer holds keeps its raw text, so it can be seen
  // and removed.
  const items: Record<string, string> = {
    [ALL]: filter.allLabel,
    ...Object.fromEntries(filter.options.map((o) => [o.value, o.label])),
  };
  if (filter.value && !(filter.value in items))
    items[filter.value] = filter.value;
  return (
    <div className={CELL}>
      <Select
        items={items}
        value={filter.value ?? ALL}
        onValueChange={(next) =>
          typeof next === "string" && filter.onChange(next === ALL ? null : next)
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
      {children}
    </div>
  );
}
