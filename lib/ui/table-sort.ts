// Sorting a table by one of its columns (DataTable, after Accordee, Sacha
// 24/11/2026). The values are read from the rendered cells (`data-sort`,
// else a `<time datetime>`, else the text), so every table sorts without
// code of its own; this file holds the pure part: what a value is and in
// which order the rows go.

export type SortDirection = "ascending" | "descending";

export type SortState = { column: number; direction: SortDirection } | null;

// A row as measured in the page: a group's heading row stays where it is
// and the rows under it sort among themselves.
export type MeasuredRow = { group: boolean; values: string[] };

// Fewer rows than this: nothing worth sorting.
export const MIN_SORTED_ROWS = 3;

// What a cell shows when it has no value (EMPTY_CELL and its kin): always
// last, whatever the direction.
const EMPTY = new Set(["", "—", "–", "-"]);

const collator = new Intl.Collator("fr", {
  numeric: true,
  sensitivity: "base",
});

// "1 234,56 €", "−12 %", "+3", "42": a number; null otherwise.
export function parseNumber(text: string): number | null {
  const compact = text.replace(/[\s  €$£%+]/g, "").replace(/^[−–]/, "-");
  if (!/^-?\d+(?:[.,]\d+)?$/.test(compact)) return null;
  return Number(compact.replace(",", "."));
}

const MONTHS: Record<string, number> = {
  janv: 0,
  janvier: 0,
  févr: 1,
  fevr: 1,
  février: 1,
  mars: 2,
  avr: 3,
  avril: 3,
  mai: 4,
  juin: 5,
  juil: 6,
  juillet: 6,
  août: 7,
  aout: 7,
  sept: 8,
  septembre: 8,
  oct: 9,
  octobre: 9,
  nov: 10,
  novembre: 10,
  déc: 11,
  dec: 11,
  décembre: 11,
};

// An ISO date ("2026-11-24", with or without time), "24 nov. 2026" or
// "24/11/2026": its time in ms; null otherwise.
export function parseDate(text: string): number | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const time = Date.parse(text);
    return Number.isNaN(time) ? null : time;
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slash)
    return Date.UTC(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
  const named = /^(\d{1,2})(?:er)?\s+([a-zéûè]+)\.?\s+(\d{4})/i.exec(text);
  const month = named ? MONTHS[named[2].toLowerCase()] : undefined;
  if (!named || month === undefined) return null;
  return Date.UTC(Number(named[3]), month, Number(named[1]));
}

const isEmpty = (value: string) => EMPTY.has(value.trim());

// The values of one column, as keys of a single kind: numbers when every
// filled cell is a number, dates when every one is a date, text otherwise.
function columnKeys(values: string[]): (string | number | null)[] {
  const filled = values.filter((value) => !isEmpty(value));
  for (const parse of [parseNumber, parseDate]) {
    const keys = values.map((value) => (isEmpty(value) ? null : parse(value)));
    if (
      filled.length > 0 &&
      keys.every((key, i) => key !== null || isEmpty(values[i]))
    )
      return keys;
  }
  return values.map((value) => (isEmpty(value) ? null : value));
}

function compareKeys(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * The rows' order (their indexes) sorted on one column: empty cells last,
 * equal ones in their first order, a group's heading row fixed with its
 * rows sorted under it.
 */
export function sortedOrder(rows: MeasuredRow[], sort: SortState): number[] {
  const identity = rows.map((_, index) => index);
  if (!sort) return identity;
  const keys = columnKeys(rows.map((row) => row.values[sort.column] ?? ""));
  const sign = sort.direction === "ascending" ? 1 : -1;
  const sortSegment = (segment: number[]) =>
    [...segment].sort((a, b) => {
      const ka = keys[a];
      const kb = keys[b];
      if (ka === null || kb === null)
        return ka === kb ? a - b : ka === null ? 1 : -1;
      return sign * compareKeys(ka, kb) || a - b;
    });

  const order: number[] = [];
  let segment: number[] = [];
  for (const index of identity) {
    if (rows[index].group) {
      order.push(...sortSegment(segment), index);
      segment = [];
    } else segment.push(index);
  }
  return [...order, ...sortSegment(segment)];
}

/**
 * The columns worth a sort: enough rows, and at least two different values
 * in the column (a column of icons, checkboxes or "⋯" has none).
 */
export function sortableColumns(rows: MeasuredRow[]): Set<number> {
  const data = rows.filter((row) => !row.group);
  const columns = new Set<number>();
  if (data.length < MIN_SORTED_ROWS) return columns;
  const width = Math.max(0, ...data.map((row) => row.values.length));
  for (let column = 0; column < width; column++) {
    const distinct = new Set(
      data
        .map((row) => row.values[column] ?? "")
        .filter((value) => !isEmpty(value)),
    );
    if (distinct.size > 1) columns.add(column);
  }
  return columns;
}

/** Ascending, descending, then back to the table's own order. */
export function nextSort(sort: SortState, column: number): SortState {
  if (!sort || sort.column !== column)
    return { column, direction: "ascending" };
  return sort.direction === "ascending"
    ? { column, direction: "descending" }
    : null;
}
