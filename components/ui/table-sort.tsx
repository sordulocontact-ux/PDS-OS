"use client";

import {
  Children,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { IconArrowDown, IconArrowUp } from "@/components/icons";
import { TableBody } from "@/components/ui/table";
import { columnIcons, type ColumnIcon } from "@/lib/ui/column-icons";
import {
  nextSort,
  sortableColumns,
  sortedOrder,
  type MeasuredRow,
  type SortState,
} from "@/lib/ui/table-sort";
import { cn } from "@/lib/utils";

// Sorting any DataTable by a click on a column's head (after Accordee,
// Sacha 24/11/2026): ascending, descending, then the table's own order.
// The body reads its values from the cells it rendered, so a table needs
// no code of its own; `DataTableCell sort` gives a value when the text does
// not sort well. The sort lives in the page (a view's comfort, never data)
// and holds while the search or the filters change the rows.

type SortContextValue = {
  sort: SortState;
  toggle: (column: number) => void;
  sortable: ReadonlySet<number>;
  setSortable: (columns: Set<number>) => void;
  // The data rows' indexes (totals and group headings left out) in the
  // order shown; null while the table keeps its own order.
  order: readonly number[] | null;
  setOrder: (order: number[] | null) => void;
};

const SortContext = createContext<SortContextValue | null>(null);

const sameSet = (a: ReadonlySet<number>, b: ReadonlySet<number>) =>
  a.size === b.size && [...a].every((value) => b.has(value));

const sameOrder = (a: readonly number[] | null, b: readonly number[] | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.length === b.length &&
    a.every((value, i) => value === b[i]));

/**
 * The sort of one table. Every DataTable has one; a list whose rows open a
 * side sheet puts one around its table and its sheet, so that ↑ ↓ follow
 * the order shown (`useShownOrder`): the table's own then joins it.
 */
export function TableSortProvider({
  scope = false,
  children,
}: {
  // Its own sort even inside another one (a list of files in a contract's
  // side sheet, itself under the contracts' table).
  scope?: boolean;
  children: React.ReactNode;
}) {
  const outer = useContext(SortContext);
  const [sort, setSort] = useState<SortState>(null);
  const [order, setOrderState] = useState<readonly number[] | null>(null);
  const [sortable, setSortableState] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const toggle = useCallback(
    (column: number) => setSort((current) => nextSort(current, column)),
    [],
  );
  const setSortable = useCallback(
    (columns: Set<number>) =>
      setSortableState((current) =>
        sameSet(current, columns) ? current : columns,
      ),
    [],
  );
  const setOrder = useCallback(
    (next: number[] | null) =>
      setOrderState((current) => (sameOrder(current, next) ? current : next)),
    [],
  );
  const value = useMemo(
    () => ({ sort, toggle, sortable, setSortable, order, setOrder }),
    [sort, toggle, sortable, setSortable, order, setOrder],
  );
  if (outer && !scope) return children;
  return <SortContext value={value}>{children}</SortContext>;
}

/**
 * The data rows' indexes in the order the table shows them, null when it
 * keeps its own: what a side sheet's ↑ ↓ follow.
 */
export function useShownOrder(): readonly number[] | null {
  return useContext(SortContext)?.order ?? null;
}

// Text a reader does not see as the cell's value: a control's label (the
// "⋯", a checkbox; not the row's own link), screen-reader text, icons.
const NOT_VALUE =
  "button:not([data-row-link]), input, select, textarea, .sr-only, [aria-hidden='true']";

function visibleText(cell: HTMLTableCellElement): string {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    // Only inside the cell: an open dialog hides the page (aria-hidden).
    const hidden = node.parentElement?.closest(NOT_VALUE);
    if (!hidden || !cell.contains(hidden)) text += node.textContent;
  }
  return text.replace(/\s+/g, " ").trim();
}

// What a cell sorts on: its `data-sort`, else the date of a <time>, else
// its visible text.
function cellValue(cell: HTMLTableCellElement): string {
  return (
    cell.dataset.sort ??
    cell.querySelector("time[datetime]")?.getAttribute("datetime") ??
    visibleText(cell)
  );
}

// The rows as the page shows them, or null when they cannot be sorted
// safely (a row that is not one React child, a detail row across columns,
// a cell heading several rows).
function measure(
  body: HTMLTableSectionElement,
  count: number,
): MeasuredRow[] | null {
  const rows = [...body.rows];
  if (rows.length !== count) return null;
  const measured: MeasuredRow[] = [];
  for (const row of rows) {
    // A group's heading or a total: stays where it is.
    const group = row.hasAttribute("data-sort-fixed");
    const cells = [...row.cells];
    if (cells.some((cell) => cell.rowSpan > 1)) return null;
    if (!group && cells.some((cell) => cell.colSpan > 1)) return null;
    measured.push({ group, values: group ? [] : cells.map(cellValue) });
  }
  return measured;
}

/** The table's body, its rows in the order of the sort. */
export function SortedTableBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const context = useContext(SortContext);
  const ref = useRef<HTMLTableSectionElement>(null);
  const items = Children.toArray(children);
  // The rows measured, and the children they were measured from: new
  // children show in their own order first, are measured before the paint,
  // then sorted.
  const [measured, setMeasured] = useState<{
    source: React.ReactNode;
    rows: MeasuredRow[] | null;
  } | null>(null);
  const fresh =
    measured && measured.source === children ? measured.rows : null;
  const sort = context?.sort ?? null;
  const order = useMemo(
    () => (fresh && sort ? sortedOrder(fresh, sort) : null),
    [fresh, sort],
  );
  const setSortable = context?.setSortable;
  const setOrder = context?.setOrder;

  useLayoutEffect(() => {
    if (!ref.current || measured?.source === children) return;
    const rows = measure(ref.current, Children.toArray(children).length);
    setMeasured({ source: children, rows });
    setSortable?.(rows ? sortableColumns(rows) : new Set());
  }, [children, measured, setSortable]);

  // The order shown, by data row (a total or a group heading is not one).
  useLayoutEffect(() => {
    if (!setOrder) return;
    if (!fresh || !order) return setOrder(null);
    const dataIndex: number[] = [];
    let next = 0;
    for (const row of fresh) dataIndex.push(row.group ? -1 : next++);
    setOrder(order.map((i) => dataIndex[i]).filter((i) => i >= 0));
  }, [fresh, order, setOrder]);

  return (
    <TableBody ref={ref} className={className}>
      {order && order.length === items.length
        ? order.map((index) => items[index])
        : items}
    </TableBody>
  );
}

/**
 * A column head's label: a button that sorts the table on that column when
 * the column holds values to sort, the plain label otherwise.
 */
// `icon`: drawn before the column's name, in its color (DataTableHead icon).
export function SortableHeadLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  // Its key (lib/ui/column-icons.ts), not the component: a table rendered
  // on the server passes it to this client label (a function cannot cross).
  icon?: ColumnIcon;
}) {
  const Icon = icon && columnIcons[icon];
  const glyph = Icon && <Icon aria-hidden className="size-4 shrink-0" />;
  const context = useContext(SortContext);
  const ref = useRef<HTMLSpanElement>(null);
  const [column, setColumn] = useState<number | null>(null);
  const sortable =
    context !== null && column !== null && context.sortable.has(column);
  const direction =
    sortable && context.sort?.column === column ? context.sort.direction : null;

  // Its place among the head's cells, read from the page.
  useLayoutEffect(() => {
    const head = ref.current?.closest("th");
    const index = head ? head.cellIndex : null;
    if (index !== column) setColumn(index);
    if (!head) return;
    if (sortable) head.setAttribute("aria-sort", direction ?? "none");
    else head.removeAttribute("aria-sort");
    // Measured again with the rows: a column shown or hidden moves it.
  }, [column, sortable, direction, context?.sortable]);

  if (!sortable)
    return (
      <span ref={ref} className="contents">
        {glyph ? (
          <span className="inline-flex max-w-full items-center gap-1.5">
            {glyph}
            <span className="truncate">{children}</span>
          </span>
        ) : (
          children
        )}
      </span>
    );
  const Arrow = direction === "descending" ? IconArrowDown : IconArrowUp;
  return (
    <span ref={ref} className="contents">
      <button
        type="button"
        onClick={() => context.toggle(column)}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 text-inherit outline-none after:absolute after:inset-0 hover:text-[color:var(--text-primary)] focus-visible:underline",
          direction && "text-[color:var(--text-primary)]",
        )}
      >
        {glyph}
        <span className="truncate">{children}</span>
        {direction && <Arrow aria-hidden className="size-3.5 shrink-0" />}
      </button>
    </span>
  );
}
