"use client";

import { useRef, type ReactNode } from "react";

import type { BoardColumn } from "@/components/projects/titles/board-columns";
import type { BoardRow } from "@/components/projects/titles/board-rows";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  ROW_INSET,
} from "@/components/ui/data-table";
import { TableRow } from "@/components/ui/table";
import { useScrollFade } from "@/components/ui/use-scroll-fade";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { cn } from "@/lib/utils";

const fr = { projectTitles };

// The table is the Excel's width (Ibé's tracking table: every column),
// wider than the page: it scrolls inside its frame, the page never does.
// Artiste stays on the left and « ⋯ » on the right (`sticky`, Maël
// 23/11/2026) while it scrolls, on their own ground so that nothing shows
// through, above the links of the other cells (`z-20` > their `z-10`); their
// column rule drawn by the cell itself (`before:`, a border staying behind
// in a collapsed table), so it follows the cell. No drop shadow: not the
// site's art direction (Maël 23/11/2026). Literal classes: Tailwind only
// generates what it reads in full.
const ARTIST =
  "sticky left-0 z-20 w-52 min-w-52 max-w-52 bg-card not-last:border-r-0 before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-[var(--border-hairline)] in-[.section-card_.table-flat]:before:hidden";
const ACTIONS =
  "sticky right-0 z-20 w-16 bg-card pl-4 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-[var(--border-hairline)] in-[.section-card_.table-flat]:before:hidden";

// The header's sticky cells on the header's band: the card's ground under
// the band's tint (translucent in the dark theme, it would let the columns
// scrolled under it show through); bare in a section card, as the band.
const STICKY_HEAD =
  "[background-image:linear-gradient(var(--surface-soft),var(--surface-soft))] in-[.section-card_.table-flat]:[background-image:none]";

// Without « ⋯ » (a reader), the right edge fades out while columns remain
// there.
const END_FADE =
  "[&_[data-slot=table-container][data-fade=both]]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [&_[data-slot=table-container][data-fade=end]]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]";

// A row of the board. Not DataTableRow: the name's link opens the side
// sheet from the sticky Artiste cell (a positioned cell bounds it), the
// other cells hold their own links, so nothing lights up the whole row.
const ROW = cn(
  "border-0 hover:bg-transparent has-aria-expanded:bg-transparent",
  ROW_INSET,
);

/**
 * « Titres » par artiste as a table (Sacha 27/11/2026): Artiste, then one
 * fact a column (`columns`, board-columns.tsx), each with its icon, and
 * « ⋯ ». One row a child, so that a click on a head sorts them (the
 * abandoned titles under their own heading, which stays in place).
 */
export function BoardTable({
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
  // The Artiste cell of a row (its name opens the side sheet).
  artist: (row: BoardRow) => ReactNode;
  // « ⋯ » of a row; null: nobody may act here (no empty column).
  menu: ((row: BoardRow) => ReactNode) | null;
  abandonedHead: ReactNode;
}) {
  const t = fr.projectTitles;
  const row = (r: BoardRow) => (
    <TableRow key={r.id} className={ROW}>
      <DataTableCell className={ARTIST}>{artist(r)}</DataTableCell>
      {columns.map((column) => (
        <DataTableCell key={column.key} className={column.className}>
          {column.cell(r)}
        </DataTableCell>
      ))}
      {menu && (
        <DataTableActionsCell className={ACTIONS}>
          {menu(r)}
        </DataTableActionsCell>
      )}
    </TableRow>
  );
  return (
    <ScrollingTable fadeEnd={menu === null}>
      <DataTableHeader>
        <DataTableHead icon="artist" className={cn(ARTIST, STICKY_HEAD)}>
          {t.recap.columns.artist}
        </DataTableHead>
        {columns.map((column) => (
          <DataTableHead
            key={column.key}
            icon={column.icon}
            className={column.className}
          >
            {column.label}
          </DataTableHead>
        ))}
        {menu && (
          <DataTableActionsHead
            label={t.board.columns.actions}
            className={cn(ACTIONS, STICKY_HEAD)}
          />
        )}
      </DataTableHeader>
      <DataTableBody>
        {[
          ...live.map(row),
          ...(abandoned.length > 0
            ? [
                <DataTableGroupRow
                  key="abandoned"
                  columns={columns.length + 1 + Number(menu !== null)}
                >
                  {/* Kept in sight while the table scrolls sideways. */}
                  <span className="sticky left-4 inline-flex text-[length:var(--type-body-md)] font-semibold">
                    {abandonedHead}
                  </span>
                </DataTableGroupRow>,
              ]
            : []),
          ...abandoned.map(row),
        ]}
      </DataTableBody>
    </ScrollingTable>
  );
}

/** The table in its frame, scrolling sideways when it is wider (the
 * shadcn Table's own box, `data-slot="table-container"`); without « ⋯ »
 * (`fadeEnd`), the right edge fades while columns are hidden there.
 * `isolate`: what stands above a cell (`relative z-10`, the sticky columns)
 * stays inside the table. */
function ScrollingTable({
  fadeEnd,
  children,
}: {
  fadeEnd: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLElement | null>(null);
  useScrollFade(box, "x");
  return (
    <div
      ref={(node) => {
        box.current =
          node?.querySelector<HTMLElement>('[data-slot="table-container"]') ??
          null;
      }}
      className={cn("isolate", fadeEnd && END_FADE)}
    >
      <DataTable>{children}</DataTable>
    </div>
  );
}
