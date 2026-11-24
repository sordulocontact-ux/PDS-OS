"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { FilterBar } from "@/components/ui/filter-bar";
import { filterParamsOf } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";

export type UrlFilterGroup = {
  // The URL param it writes (?domain=, ?audio=…).
  key: string;
  label: string;
  allLabel: string;
  // Only the values some row of the tab holds.
  options: { value: string; label: string }[];
  // The values chosen, read by `filterValues` (lib/ui/filter-options.ts).
  current: string[];
  // One choice, behind the filter button or as segments in the panel
  // (Actifs / Archivés).
  menuOnly?: boolean;
};

type Chosen = Record<string, string[]>;

/**
 * The filters of a list page kept in the URL with the page's other params
 * (tab, archive): `FilterBar` (selects up to 3 axes, the « Filtres » panel
 * beyond), each choice a navigation, the values of an axis in one param
 * (`filterParamOf`). The boxes show what was ticked at once, before the
 * page answers (several ticks in a row add up). Réseau, Catalogue,
 * Artistes, Fichiers, Contrats, Calls, Deals, Dépenses, Mails…
 */
export function UrlFilters({
  path,
  params,
  groups,
}: {
  path: string;
  // The URL's other params (tab, archive), kept by every filter.
  params: Record<string, string | null>;
  groups: UrlFilterGroup[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [current, choose] = useOptimistic(
    Object.fromEntries(
      groups.map((group) => [group.key, group.current]),
    ) as Chosen,
    (state: Chosen, next: Chosen) => next,
  );
  const go = (next: Chosen) =>
    startTransition(() => {
      choose(next);
      router.push(viewHref(path, { ...params, ...filterParamsOf(next) }), {
        scroll: false,
      });
    });

  return (
    <FilterBar
      filters={groups.map((group) => ({
        key: group.key,
        label: group.label,
        allLabel: group.allLabel,
        options: group.options,
        values: current[group.key] ?? [],
        menuOnly: group.menuOnly,
        onChange: (values) => go({ ...current, [group.key]: values }),
      }))}
      onClear={() =>
        go(Object.fromEntries(groups.map((group) => [group.key, []])))
      }
    />
  );
}
