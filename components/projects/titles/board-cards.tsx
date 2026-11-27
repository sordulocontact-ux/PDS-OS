"use client";

import { Fragment, type ReactNode } from "react";

import type { BoardColumn } from "@/components/projects/titles/board-columns";
import type { BoardRow } from "@/components/projects/titles/board-rows";
import { caption } from "@/components/projects/titles/recap-facts";
import { cn } from "@/lib/utils";

/**
 * « Titres » par artiste on a phone (Maël 23/11/2026: a table's sticky
 * columns left 120 px to read): a card a row, its head (the artist's name,
 * opening its side sheet as the whole card does) with « ⋯ » at its top
 * right, then the table's columns one under the other, label and value:
 * the same cells, the same states. Cards keep apart by their gap, never a
 * rule.
 */
export function BoardCards({
  live,
  abandoned,
  columns,
  artist,
  menu,
  abandonedHead,
}: {
  live: BoardRow[];
  abandoned: BoardRow[];
  columns: BoardColumn[];
  artist: (row: BoardRow) => ReactNode;
  menu: ((row: BoardRow) => ReactNode) | null;
  abandonedHead: ReactNode;
}) {
  const card = (row: BoardRow) => (
    <div
      key={row.id}
      // `relative`: the name's link covers the card (DataTableLink).
      className="relative flex min-w-0 flex-col gap-3 rounded-xl border border-[color:var(--border-default)] bg-card p-4 text-[length:var(--type-body-md)] font-medium"
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">{artist(row)}</div>
        {menu && <div className="-mt-1.5 -mr-2 shrink-0">{menu(row)}</div>}
      </div>
      <dl className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-3 gap-y-2.5">
        {columns.map((column) => (
          <Fragment key={column.key}>
            <dt className={cn(caption, "pt-0.5 break-words")}>
              {column.label}
            </dt>
            <dd className="min-w-0">{column.cell(row)}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      {live.map(card)}
      {abandoned.length > 0 && (
        <p className="mt-2 px-1 text-[length:var(--type-body-md)] font-semibold">
          {abandonedHead}
        </p>
      )}
      {abandoned.map(card)}
    </div>
  );
}
