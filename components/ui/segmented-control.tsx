"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { useSegmentIndicator } from "@/components/ui/use-segment-indicator";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

/**
 * One choice among a few, as segments in a framed bar (référence de Sacha
 * du 05/11/2026, « Spans | Traces »): a hairline frame on the control's
 * ground, the chosen segment on a soft grey, the others in secondary ink.
 * Replaces the row of pills for every single choice: a form's choice
 * (`SegmentedControl`, through `ChipChoice`) and a view of a list in the URL
 * (`SegmentedLinks`, through `ViewToggle`). Several choices that combine stay
 * `FilterChip`. Too many segments for the width wrap inside the frame. The
 * chosen ground slides from one segment to the next (`useSegmentIndicator`).
 */

const frameClass = (fill: boolean) =>
  cn(
    "group/segments relative max-w-full flex-wrap gap-1 rounded-[var(--radius-xl)] border border-border bg-[var(--control-bg)] p-1",
    fill ? "flex w-full" : "inline-flex",
  );

const segmentClass = (active: boolean, fill: boolean) =>
  cn(
    "relative inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-4 text-sm font-medium whitespace-nowrap no-underline transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40",
    fill && "flex-1",
    // Its own ground until the sliding one is measured (server HTML).
    active
      ? "bg-[var(--control-bg-soft)] text-foreground group-data-ready/segments:bg-transparent"
      : "text-[color:var(--text-secondary)] hover:bg-[var(--control-bg-hover)] hover:text-foreground",
  );

// The sliding ground, under the segments (drawn first).
function Ground({ groundRef }: { groundRef: React.Ref<HTMLSpanElement> }) {
  return (
    <span
      ref={groundRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[var(--control-bg-soft)] opacity-0 transition-[clip-path] duration-[var(--duration-slide)] ease-[var(--ease-standard)] motion-reduce:transition-none"
    />
  );
}

export type SegmentOption<V extends string> = { value: V; label: ReactNode };

/**
 * A choice of a form, as a radio group: arrows move the choice, Tab enters
 * on the chosen segment. `deselectable`: a second click on the chosen
 * segment clears it. `fill`: the bar takes the whole width, segments shared.
 */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  deselectable = false,
  fill = false,
  className,
  ...aria
}: {
  options: SegmentOption<V>[];
  value: V | null;
  onChange: (value: V | null) => void;
  deselectable?: boolean;
  fill?: boolean;
  className?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const chosen = options.findIndex((option) => option.value === value);
  const { frameRef, groundRef } = useSegmentIndicator(chosen);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div
      ref={(element) => {
        frameRef.current = element;
      }}
      role="radiogroup"
      {...aria}
      className={cn(frameClass(fill), className)}
    >
      <Ground groundRef={groundRef} />
      {options.map((option, index) => {
        const active = index === chosen;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            data-segment
            aria-checked={active}
            // Tab enters on the chosen segment (the first when none is).
            tabIndex={index === (chosen < 0 ? 0 : chosen) ? 0 : -1}
            onClick={() =>
              onChange(active && deselectable ? null : option.value)
            }
            onKeyDown={(event) => onKeyDown(event, index)}
            className={segmentClass(active, fill)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Views of a page in the URL (?vue=…), as the same bar of links. */
export function SegmentedLinks({
  label,
  options,
  fill = false,
  className,
}: {
  label: string;
  options: { key?: string; href: string; label: ReactNode; current: boolean }[];
  fill?: boolean;
  className?: string;
}) {
  const { frameRef, groundRef } = useSegmentIndicator(
    options.findIndex((option) => option.current),
    label,
  );
  return (
    <nav
      ref={(element) => {
        frameRef.current = element;
      }}
      aria-label={label}
      className={cn(frameClass(fill), className)}
    >
      <Ground groundRef={groundRef} />
      {options.map((option) => (
        <ViewLink
          key={option.key ?? option.href}
          data-segment
          href={option.href}
          aria-current={option.current ? "page" : undefined}
          className={segmentClass(option.current, fill)}
        >
          {option.label}
        </ViewLink>
      ))}
    </nav>
  );
}
