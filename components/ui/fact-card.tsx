import { IconSparkle3 } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { StatusDot } from "@/components/ui/status-dot";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/ui/state-tones";

/**
 * A fact as a card (Sacha 20/11/2026, proto « Fiche d'un deal » v2: « il y
 * a pas un autre moyen que des tableaux ? »): its label small and grey, its
 * value large (a figure) or in plain size (`text`), then its state as a dot
 * and who wrote it, on one line at the bottom. `onClick` makes the whole
 * card the button that opens it (its words in `actionLabel`, for a screen
 * reader). `action`: a button of its own at the bottom right (« Changer »),
 * never with `onClick`. `proposed`: a value PO read and a person checks (a
 * deal's term from its call, Sacha 21/11/2026) — dashed frame, sparkle
 * before the label, the passage it comes from in `quote`. Laid out by
 * `FactCards`.
 */
export function FactCard({
  label,
  value,
  text = false,
  state,
  source,
  onClick,
  actionLabel,
  action,
  proposed = false,
  quote,
}: {
  label: string;
  value: ReactNode;
  // Words rather than a figure: the value at reading size.
  text?: boolean;
  state?: { tone: Tone; label: string } | null;
  source?: string | null;
  onClick?: () => void;
  actionLabel?: string;
  action?: ReactNode;
  proposed?: boolean;
  // Where a proposed value comes from (FactSourceText).
  quote?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-caption text-[color:var(--text-secondary)]">
        {proposed && <IconSparkle3 aria-hidden className="size-3.5 shrink-0" />}
        {label}
      </span>
      <span
        className={cn(
          "font-semibold break-words",
          text ? "text-body-md" : "text-figure-lg tabular-nums",
        )}
      >
        {value}
      </span>
      {quote}
      {(state || source || action) && (
        <span className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
          {state && <StatusDot tone={state.tone} label={state.label} showLabel />}
          {source && (
            <span className="text-caption text-[color:var(--text-tertiary)]">
              {source}
            </span>
          )}
          {action}
        </span>
      )}
    </>
  );
  const frame = cn(
    "flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-4 text-left",
    proposed
      ? "border-dashed border-[color:var(--border-default)]"
      : "border-[color:var(--border-hairline)]",
  );
  if (!onClick) return <div className={frame}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={actionLabel}
      className={cn(
        frame,
        "cursor-pointer transition-colors hover:border-[color:var(--border-default)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--selection)]",
      )}
    >
      {body}
    </button>
  );
}

/** Fact cards in a grid that follows the room it has: one column on a
 * phone, two, then three. */
export function FactCards({ children }: { children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
        {children}
      </div>
    </div>
  );
}
