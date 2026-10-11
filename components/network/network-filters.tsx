"use client";

import { IconFilter, IconXmark } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroupLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";

export type NetworkFilterKey = "domain" | "relation" | "city";

export type NetworkFilterGroup = {
  key: NetworkFilterKey;
  label: string;
  allLabel: string;
  // Only the values some contact of the tab holds.
  options: { value: string; label: string }[];
  current: string | null;
};

// "all" in the radio group: no filter on that axis.
const ALL = "all";

/**
 * « Filtres » of the Réseau (tickets « Retour PO / Réseau » of 10 and
 * 11/10/2026): métier, relation type and city, each one choice, kept in the
 * URL with the tab; the active ones are pills that remove them. Archived
 * contacts stay the director's « Archivés » view.
 */
export function NetworkFilters({
  path,
  params,
  groups,
}: {
  path: string;
  // The URL's other params (tab, archive), kept by every filter.
  params: Record<string, string | null>;
  groups: NetworkFilterGroup[];
}) {
  const t = fr.network.filters;
  const router = useRouter();
  const current = Object.fromEntries(
    groups.map((group) => [group.key, group.current]),
  );
  const hrefWith = (key: NetworkFilterKey, value: string | null) =>
    viewHref(path, { ...params, ...current, [key]: value });
  const offered = groups.filter((group) => group.options.length > 0);
  const active = groups.filter((group) => group.current !== null);
  if (offered.length === 0 && active.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              <IconFilter aria-hidden />
              {active.length > 0 ? t.buttonCount(active.length) : t.button}
            </Button>
          }
        />
        <DropdownMenuContent
          align="start"
          className="max-h-[min(70vh,32rem)] overflow-y-auto"
        >
          {offered.map((group, index) => (
            <div key={group.key} className="flex flex-col">
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuRadioGroup
                value={group.current ?? ALL}
                onValueChange={(value: string) =>
                  router.push(hrefWith(group.key, value === ALL ? null : value))
                }
              >
                <DropdownMenuGroupLabel>{group.label}</DropdownMenuGroupLabel>
                <DropdownMenuRadioItem value={ALL}>
                  {group.allLabel}
                </DropdownMenuRadioItem>
                {group.options.map((option) => (
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
      {active.map((group) => (
        <FilterChipLink
          key={group.key}
          href={hrefWith(group.key, null)}
          current
          variant="soft"
        >
          <span className="sr-only">{t.remove}</span>
          {group.options.find((o) => o.value === group.current)?.label ??
            group.current}
          <IconXmark aria-hidden className="size-3.5" />
        </FilterChipLink>
      ))}
    </div>
  );
}
