"use client";

import { IconSliders } from "nucleo-sharp-essential";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { financeSpends } from "@/lib/i18n/fr/finance-spends";

const t = financeSpends;

/** The columns of Finance › Dépenses one may hide (as the proto). */
export const SPEND_COLUMNS = [
  "post",
  "supplier",
  "day",
  "state",
  "proof",
] as const;
export type SpendColumn = (typeof SPEND_COLUMNS)[number];

const DEFAULT: SpendColumn[] = ["post", "day", "state", "proof"];
const KEY = "pds.finance.spend-columns";

/**
 * The columns shown, kept in this browser (a view's comfort, never data: an
 * unreadable store gives the default).
 */
export function useSpendColumns() {
  const [shown, setShown] = useState<Set<SpendColumn>>(() => new Set(DEFAULT));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (Array.isArray(saved))
        // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser after hydration
        setShown(new Set(SPEND_COLUMNS.filter((c) => saved.includes(c))));
    } catch {}
  }, []);
  function toggle(column: SpendColumn, on: boolean) {
    setShown((current) => {
      const next = new Set(current);
      if (on) next.add(column);
      else next.delete(column);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }
  return [shown, toggle] as const;
}

/** « Colonnes »: the icon button opening the columns to tick. */
export function SpendColumnsMenu({
  shown,
  onToggle,
}: {
  shown: Set<SpendColumn>;
  onToggle: (column: SpendColumn, on: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={t.columnsMenu}
            title={t.columnsMenu}
          />
        }
      >
        <IconSliders aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SPEND_COLUMNS.map((column) => (
          <DropdownMenuCheckboxItem
            key={column}
            checked={shown.has(column)}
            onCheckedChange={(on) => onToggle(column, on)}
          >
            {t.columns[column]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
