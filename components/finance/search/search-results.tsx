"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useEffect, useRef } from "react";

import { SearchGroupLabel } from "@/components/ui/search-group-label";
import type { FinanceSearchItem } from "@/lib/finance/search";
import { financeSearch } from "@/lib/i18n/fr/finance-search";
import { cn } from "@/lib/utils";

export type SearchRow = Omit<FinanceSearchItem, "group"> & {
  group: FinanceSearchItem["group"] | "section" | "action";
};

/**
 * The rows of Finance's ⌘K, grouped (pages, budgets, spends, invoices): the
 * name, what tells it apart (amount, envelope, day), the chosen one tinted
 * and kept in view. The field keeps the focus; a click opens.
 */
export function SearchResults({
  id,
  rows,
  active,
  onHover,
  onPick,
}: {
  id: string;
  rows: SearchRow[];
  active: number;
  onHover: (index: number) => void;
  onPick: (row: SearchRow) => void;
}) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    list.current
      ?.querySelector(`#${CSS.escape(`${id}-${active}`)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [id, active]);

  return (
    <ul
      ref={list}
      id={id}
      role="listbox"
      aria-label={financeSearch.label}
      className="flex max-h-[min(420px,55dvh)] flex-col overflow-y-auto empty:hidden"
    >
      {rows.map((row, index) => (
        <li key={row.id} role="presentation" className="contents">
          {row.group !== rows[index - 1]?.group && (
            <SearchGroupLabel first={index === 0}>
              {financeSearch.groups[row.group]}
            </SearchGroupLabel>
          )}
          <span
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === active}
            onPointerMove={() => onHover(index)}
            onClick={() => onPick(row)}
            className={cn(
              "flex cursor-pointer items-baseline gap-3 rounded-lg px-2 py-2",
              index === active && "bg-[var(--selection-bg)]",
            )}
          >
            {row.group === "action" && (
              <IconPlus
                aria-hidden
                className="size-4 shrink-0 self-center text-[color:var(--text-secondary)]"
              />
            )}
            <span className="min-w-0 flex-1 truncate text-body-sm text-[color:var(--text-primary)]">
              {row.label}
            </span>
            {row.detail && (
              <span className="max-w-[55%] shrink-0 truncate text-caption text-[color:var(--text-secondary)] tabular-nums">
                {row.detail}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
