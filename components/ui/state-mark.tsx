import { IconCheck, IconXmark } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The round mark of a state, at the head of a row (Vanta, Adaline,
 * Squarespace, Sacha 07/11/2026; the steps of `JourneySpine`): done = a
 * check on green, current = a dot in the selection ring (`mine`: filled, the
 * viewer acts), waiting = a dot on amber, todo = an empty dashed ring
 * (nothing given yet), idle = an empty ring (a step not reached), off = a
 * cross on grey (set aside). Decorative: the row says its
 * state in words (`label` adds it for screen readers).
 */
export type MarkState =
  | "done"
  | "reserve"
  | "current"
  | "mine"
  | "waiting"
  | "todo"
  | "idle"
  | "off";

export function StateMark({
  state,
  size = "md",
  dashed = false,
  label,
  children,
}: {
  state: MarkState;
  size?: "sm" | "md";
  // A locked step: its ring dashed whatever its state.
  dashed?: boolean;
  label?: string;
  // Replaces the state's own sign (the journey's warning, lock, stop).
  children?: ReactNode;
}) {
  const sign =
    children ??
    (state === "done" ? (
      <IconCheck className={size === "sm" ? "size-3" : "size-3.5"} />
    ) : state === "off" ? (
      <IconXmark className="size-3" />
    ) : state === "current" || state === "mine" || state === "waiting" ? (
      <span
        className={cn(
          "rounded-full",
          size === "sm" ? "size-1.5" : "size-2",
          state === "mine"
            ? "bg-white"
            : state === "waiting"
              ? "bg-[var(--tone-warning-fg)]"
              : "bg-[var(--selection)]",
        )}
      />
    ) : null);
  return (
    <span
      className={cn(
        "relative z-10 grid shrink-0 place-items-center rounded-full border-2 border-[color:var(--border-default)] bg-card text-[color:var(--text-tertiary)]",
        size === "sm" ? "size-5" : "size-6",
        state === "done" &&
          "border-transparent bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
        state === "reserve" &&
          "border-transparent bg-[var(--tone-warning-bg)] text-[color:var(--tone-warning-fg)]",
        state === "current" &&
          "border-[color:var(--selection)] bg-[var(--selection-bg)]",
        state === "mine" && "border-[color:var(--selection)] bg-[var(--selection)]",
        state === "waiting" &&
          "border-[color:var(--tone-warning-fg)] bg-[var(--tone-warning-bg)]",
        (state === "todo" || dashed) && "border-dashed",
        state === "off" && "border-transparent bg-[var(--surface-soft)]",
      )}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <span aria-hidden className="contents">
        {sign}
      </span>
    </span>
  );
}
