"use client";

import { useEffect, useRef } from "react";

import { shell } from "@/lib/i18n/fr/shell";
import { QUICK_ACTION_ICONS } from "@/components/shell/quick-create/quick-action-icons";
import { SearchGroupLabel } from "@/components/ui/search-group-label";
import type { QuickAction } from "@/lib/shell/quick-actions";
import type { SearchRow } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const fr = { shell };

// Only the actions wear an icon: it says « this is not a page ».
function ActionIcon({ action }: { action: QuickAction }) {
  const Icon = QUICK_ACTION_ICONS[action];
  return (
    <Icon
      aria-hidden
      className="size-4 shrink-0 self-center text-[color:var(--text-secondary)]"
    />
  );
}

/**
 * The rows of the app's ⌘K, grouped (pages, projects, artists…): the name,
 * what tells it apart, the chosen one tinted and kept in view. The field
 * keeps the focus; a click opens.
 */
export function AppSearchResults({
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
  const t = fr.shell.appSearch;
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
      aria-label={t.label}
      className="flex max-h-[min(420px,55dvh)] flex-col overflow-y-auto empty:hidden"
    >
      {rows.map((row, index) => (
        <li key={row.id} role="presentation" className="contents">
          {row.group !== rows[index - 1]?.group && (
            <SearchGroupLabel first={index === 0}>
              {t.groups[row.group]}
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
            {row.group === "action" && <ActionIcon action={row.action} />}
            <span className="min-w-0 flex-1 truncate text-body-sm text-[color:var(--text-primary)]">
              {row.label || t.untitled}
            </span>
            {row.group !== "action" && row.detail && (
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
