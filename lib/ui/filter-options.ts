// Shared by the list pages that offer « Filtres » (UrlFilters, FilterBar):
// read and write a filter's values in the URL, match a row on them, and
// offer the names a list holds in alphabetical order.
//
// A filter holds several values (ticked in the « Filtres » panel): one URL
// param, the values joined by commas (`?artist=Ana,Léo`). A comma or a
// backslash inside a value is escaped by a backslash (`Dupont\, Jean`), so
// any name goes through. A single value without either is written as is:
// the links built before (`?statut=paye`) still read the same.

const SEPARATOR = ",";
const ESCAPE = "\\";

/** One URL param as the values of a filter; none = no filter. A repeated
 * param (`?a=x&a=y`) is read too. Each value once, in its order. */
export function filterValues(value: unknown): string[] {
  const raws = Array.isArray(value) ? value : [value];
  const values = raws.flatMap((raw) =>
    typeof raw === "string" ? splitValues(raw) : [],
  );
  return [...new Set(values)];
}

function splitValues(raw: string): string[] {
  const values: string[] = [];
  let current = "";
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char === ESCAPE && i + 1 < raw.length) {
      i += 1;
      current += raw[i];
    } else if (char === SEPARATOR) {
      if (current) values.push(current);
      current = "";
    } else current += char;
  }
  if (current) values.push(current);
  return values;
}

/** The values of a filter as one URL param (`filterValues` reads it back);
 * no value = no param. */
export function filterParamOf(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  return values
    .map((value) => value.replace(/[\\,]/g, (char) => `${ESCAPE}${char}`))
    .join(SEPARATOR);
}

/** Every filter of a page as URL params (kept by its tabs, `viewHref`). */
export function filterParamsOf(
  filters: Record<string, readonly string[]>,
): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(filters).map(([key, values]) => [
      key,
      filterParamOf(values),
    ]),
  );
}

/** Some filter of the page holds a value. */
export const isFiltering = (filters: Record<string, readonly string[]>) =>
  Object.values(filters).some((values) => values.length > 0);

/** One axis: no value = every row; else the row's value is one of them (a
 * choice OR the other within an axis, the axes AND each other). */
export function matchesAny(
  values: readonly string[],
  value: string | null | undefined,
): boolean {
  return values.length === 0 || (value != null && values.includes(value));
}

/** An axis on a row holding several (a title's artists, a contact's
 * relations): one of them is enough. */
export function matchesSome(
  values: readonly string[],
  held: readonly string[],
): boolean {
  return values.length === 0 || held.some((value) => values.includes(value));
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
