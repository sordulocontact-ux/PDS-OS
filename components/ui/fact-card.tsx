import {
  IconPenWriting2,
  IconPlus,
  IconSparkle3,
} from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { IconAction } from "@/components/ui/icon-action";
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
 * before the label, where it comes from in `note`. `read`: a value PO wrote
 * from a call (sparkle, plain frame, its passage in `note`). `onEdit`: a
 * pencil at the top right, shown on hover or focus (always on a touch
 * screen), when the card holds links of its own (Sacha 23/11/2026). Laid
 * out by `FactCards`.
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
  read = false,
  note,
  onEdit,
  editLabel,
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
  read?: boolean;
  // Under the value: where a proposed value comes from (ProposalSource).
  note?: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-caption text-[color:var(--text-secondary)]">
        {(proposed || read) && (
          <IconSparkle3 aria-hidden className="size-3.5 shrink-0" />
        )}
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
      {note}
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
  if (onEdit)
    return (
      <div className={cn(frame, "group/card relative pr-12")}>
        {body}
        <span className="absolute top-2.5 right-2.5 transition-opacity duration-[var(--duration-fast)] [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within/card:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/card:opacity-100">
          <IconAction
            label={editLabel ?? ""}
            icon={IconPenWriting2}
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
          />
        </span>
      </div>
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

/**
 * A fact still to write, in the place of its card (Sacha 22/11/2026, proto
 * « Termes à définir » v2 « Emplacements vides »: Ibé finds a table to edit
 * « algorithmique »): dashed, no fill, its label, then « + Définir » at the
 * bottom. `onClick` makes it
 * the button that fills it; without, it says `emptyLabel`. In `FactCards`.
 */
export function FactSlot({
  label,
  actionText,
  emptyLabel,
  onClick,
  actionLabel,
}: {
  label: string;
  // « Définir », shown when the slot can be filled.
  actionText: string;
  // « À définir », for whoever only reads.
  emptyLabel: string;
  onClick?: () => void;
  actionLabel?: string;
}) {
  const body = (
    <>
      <span className="text-caption text-[color:var(--text-secondary)]">
        {label}
      </span>
      <span className="mt-auto flex items-center gap-1.5 pt-1 text-body-sm font-semibold text-[color:var(--text-secondary)]">
        {onClick ? (
          <>
            <IconPlus aria-hidden className="size-3.5 shrink-0" />
            {actionText}
          </>
        ) : (
          <span className="font-normal text-[color:var(--text-tertiary)]">
            {emptyLabel}
          </span>
        )}
      </span>
    </>
  );
  const frame =
    "flex min-h-28 min-w-0 flex-col gap-1.5 rounded-xl border-[1.5px] border-dashed border-[color:var(--border-default)] bg-transparent p-4 text-left";
  if (!onClick) return <div className={frame}>{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={actionLabel}
      className={cn(
        frame,
        "cursor-pointer transition-colors hover:border-[color:var(--border-hover)] hover:bg-[color:var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--selection)]",
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
