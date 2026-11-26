"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useRowSelection } from "@/components/ui/row-selection";
import { records } from "@/lib/i18n/fr/records";

const fr = { records };

/**
 * The bar floating at the bottom of the screen once a row of a list is
 * ticked (RowSelection): how many, the list's gestures on them (`children`),
 * then let go of the selection (✕ or Escape). `paused`: a dialog opened
 * from the bar handles its own Escape.
 */
export function SelectionBar({
  paused = false,
  children,
}: {
  paused?: boolean;
  children: React.ReactNode;
}) {
  const t = fr.records.selection;
  const { selected, clear } = useRowSelection();
  const count = selected.length;

  useEffect(() => {
    if (count === 0 || paused) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count, paused, clear]);

  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label={t.bar}
      className="surface-glass fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 mx-auto flex w-fit items-center gap-1 rounded-full bg-[var(--surface-glass)] py-1.5 pr-1.5 pl-5 text-[color:var(--text-primary)] shadow-[var(--elevation-3)] backdrop-blur-[var(--glass-panel-blur)] transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none starting:translate-y-2 starting:opacity-0"
    >
      <span
        aria-live="polite"
        className="mr-3 text-[length:var(--type-body-md)] font-medium tabular-nums"
      >
        {t.count(count)}
      </span>
      {children}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t.clear}
        onClick={clear}
      >
        <IconXmark aria-hidden />
      </Button>
    </div>
  );
}
