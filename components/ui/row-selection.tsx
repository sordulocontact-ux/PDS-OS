"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { TableCell, TableHead } from "@/components/ui/table";

// Rows ticked in a list (DataTable). Each row's checkbox registers the row
// while it is shown: the selection only ever holds rows on screen, so a row
// hidden by a search or gone after a refresh is never acted upon.

export type SelectableRow = { id: string; name: string };

type RowSelectionValue = {
  // Ticked rows still on screen, in the order they were registered.
  selected: SelectableRow[];
  shownCount: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string, on: boolean) => void;
  toggleAll: (on: boolean) => void;
  clear: () => void;
  register: (row: SelectableRow) => () => void;
};

const RowSelectionContext = createContext<RowSelectionValue | null>(null);

export function RowSelection({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState<Map<string, SelectableRow>>(new Map());
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  const register = useCallback((row: SelectableRow) => {
    setShown((prev) => new Map(prev).set(row.id, row));
    return () =>
      setShown((prev) => {
        const next = new Map(prev);
        next.delete(row.id);
        return next;
      });
  }, []);

  const value = useMemo<RowSelectionValue>(() => {
    const selected = [...shown.values()].filter((row) => ticked.has(row.id));
    return {
      selected,
      shownCount: shown.size,
      isSelected: (id) => ticked.has(id) && shown.has(id),
      toggle: (id, on) =>
        setTicked((prev) => {
          const next = new Set(prev);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        }),
      toggleAll: (on) => setTicked(on ? new Set(shown.keys()) : new Set()),
      clear: () => setTicked(new Set()),
      register,
    };
  }, [shown, ticked, register]);

  return (
    <RowSelectionContext.Provider value={value}>
      {children}
    </RowSelectionContext.Provider>
  );
}

export function useRowSelection(): RowSelectionValue {
  const value = useContext(RowSelectionContext);
  if (!value) throw new Error("useRowSelection outside RowSelection");
  return value;
}

// A 36 px target around a 16 px native box, above the row's stretched link
// (DataTableLink).
function Checkbox(props: React.ComponentProps<"input">) {
  return (
    <label className="relative z-10 -ml-2.5 flex size-9 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        className="size-4 cursor-pointer accent-selection"
        {...props}
      />
    </label>
  );
}

// First column header: ticks every row shown, half-ticked when some are.
export function SelectAllHead({ label }: { label: string }) {
  const { selected, shownCount, toggleAll } = useRowSelection();
  const ref = useRef<HTMLInputElement>(null);
  const all = shownCount > 0 && selected.length === shownCount;
  const some = selected.length > 0 && !all;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some;
  }, [some]);

  return (
    <TableHead className="h-auto w-10 px-0 pb-0 align-middle">
      <Checkbox
        ref={ref}
        aria-label={label}
        checked={all}
        disabled={shownCount === 0}
        onChange={(event) => toggleAll(event.target.checked)}
      />
    </TableHead>
  );
}

// First cell of a row.
export function SelectRowCell({
  row,
  label,
}: {
  row: SelectableRow;
  label: string;
}) {
  const { isSelected, toggle, register } = useRowSelection();
  const { id, name } = row;
  useEffect(() => register({ id, name }), [register, id, name]);

  return (
    <TableCell className="w-10 px-0 py-0.5 align-middle">
      <Checkbox
        aria-label={label}
        checked={isSelected(id)}
        onChange={(event) => toggle(id, event.target.checked)}
      />
    </TableCell>
  );
}

// A row that cannot be selected (a draft) keeps the column aligned.
export function SelectEmptyCell() {
  return <TableCell className="w-10 px-0 py-0.5" />;
}
