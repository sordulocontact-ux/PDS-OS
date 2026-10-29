// Shared by the list pages that offer « Filtres » (UrlFilters): read one
// filter from the URL, and offer the names a list holds in alphabetical order.

/** One URL param as a filter value: a string, or no filter. */
export function filterParam(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** id → name, as the options of one filter group, sorted by name. */
export function optionsByName(
  names: Map<string, string>,
): { value: string; label: string }[] {
  return [...names.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "fr"))
    .map(([value, label]) => ({ value, label }));
}

/** Names that are their own value (an author, a category), each once. */
export function optionsOfNames(
  names: (string | null | undefined)[],
): { value: string; label: string }[] {
  return optionsByName(
    new Map(names.flatMap((name) => (name ? [[name, name] as const] : []))),
  );
}
