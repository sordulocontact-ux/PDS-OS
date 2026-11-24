// One axis of a list's filters, shared by `FilterBar` (its selects) and
// `FilterPanel` (its boxes to tick).

export type FilterOption = { value: string; label: string };

export type FilterControl = {
  key: string;
  label: string;
  // The "no filter" choice ("Tous les types").
  allLabel: string;
  options: FilterOption[];
  // The values chosen: none = no filter; several = any of them (OR).
  values: string[];
  onChange: (values: string[]) => void;
  // One choice only, behind the filter button or in the panel as segments,
  // never a select (Actifs / Archivés).
  menuOnly?: boolean;
};

/** The options, then each value chosen that the list no longer holds, with
 * its raw text: it can still be seen and removed. */
export function optionsWithValues(filter: FilterControl): FilterOption[] {
  const listed = new Set(filter.options.map((option) => option.value));
  return [
    ...filter.options,
    ...filter.values
      .filter((value) => !listed.has(value))
      .map((value) => ({ value, label: value })),
  ];
}
