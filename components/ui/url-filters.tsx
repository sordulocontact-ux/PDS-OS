"use client";

import { useRouter } from "next/navigation";

import { FilterBar } from "@/components/ui/filter-bar";
import { viewHref } from "@/lib/ui/view-href";

export type UrlFilterGroup = {
  // The URL param it writes (?domain=, ?audio=…).
  key: string;
  label: string;
  allLabel: string;
  // Only the values some row of the tab holds.
  options: { value: string; label: string }[];
  current: string | null;
};

/**
 * The filters of a list page kept in the URL with the page's other params
 * (tab, archive): `FilterBar` (the first ones as selects beside the search,
 * the others behind the filter button), each choice a navigation. Réseau,
 * Catalogue, Artistes, Fichiers, Contrats, Calls, historique Juridique.
 */
export function UrlFilters({
  path,
  params,
  groups,
  inline,
}: {
  path: string;
  // The URL's other params (tab, archive), kept by every filter.
  params: Record<string, string | null>;
  groups: UrlFilterGroup[];
  // How many are selects; the rest go behind the filter button.
  inline?: number;
}) {
  const router = useRouter();
  const current = Object.fromEntries(
    groups.map((group) => [group.key, group.current]),
  );
  const go = (filters: Record<string, string | null>) =>
    router.push(viewHref(path, { ...params, ...filters }), { scroll: false });

  return (
    <FilterBar
      inline={inline}
      filters={groups.map((group) => ({
        key: group.key,
        label: group.label,
        allLabel: group.allLabel,
        options: group.options,
        value: group.current,
        onChange: (value) => go({ ...current, [group.key]: value }),
      }))}
      onClear={() => go({})}
    />
  );
}
