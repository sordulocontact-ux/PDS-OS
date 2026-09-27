"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useLayoutEffect, useRef, useState } from "react";

import type { FramingView, StepOverview } from "@/lib/framing/guide";
import { fr } from "@/lib/i18n/fr";
import { ViewLink } from "@/components/ui/view-link";
import { framingStepTone, type Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

// Only empty/to_review/confirmed ever reach these (framingStepTone), but the
// map is typed over every Tone to stay exhaustive as the palette grows.
const DOT: Record<Tone, string> = {
  neutral: "bg-[var(--tone-neutral-fg)]",
  info: "bg-[var(--tone-info-fg)]",
  warning: "bg-[var(--tone-warning-fg)]",
  success: "bg-[var(--tone-success-fg)]",
  danger: "bg-[var(--tone-danger-fg)]",
  action: "bg-[var(--tone-action-fg)]",
};

// A confirmed point shows a check instead of its dot, in the same tone.
const CHECK: Record<Tone, string> = {
  neutral: "text-[color:var(--tone-neutral-fg)]",
  info: "text-[color:var(--tone-info-fg)]",
  warning: "text-[color:var(--tone-warning-fg)]",
  success: "text-[color:var(--tone-success-fg)]",
  danger: "text-[color:var(--tone-danger-fg)]",
  action: "text-[color:var(--tone-action-fg)]",
};

const itemClass = (shown: boolean) =>
  cn(
    "relative flex flex-col gap-1 rounded-2xl px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
    !shown && "hover:bg-[var(--control-bg-hover)]",
  );

/**
 * The 5 points of the Framing, each with its status and one-line summary,
 * then the recap. The blue card under the current point slides to the
 * clicked one at once, before the server answers, so a change of point reads
 * as one movement rather than a card vanishing and reappearing.
 */
export function FramingStepNav({
  steps,
  current,
  hrefs,
}: {
  steps: StepOverview[];
  current: FramingView;
  hrefs: Record<FramingView, string>;
}) {
  const t = fr.framingGuide;
  // The point clicked while its page loads; `from` drops it once the page
  // (or the back button) has moved elsewhere.
  const [clicked, setClicked] = useState<{
    view: FramingView;
    from: FramingView;
  } | null>(null);
  const shown = clicked && clicked.from === current ? clicked.view : current;

  const listRef = useRef<HTMLOListElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // The card is moved by writing its geometry, not through React state: a
  // measure has to happen after layout, and must not re-render the list.
  useLayoutEffect(() => {
    const list = listRef.current;
    const card = cardRef.current;
    if (!list || !card) return;
    const place = () => {
      const item = list.querySelector<HTMLElement>(`[data-view="${shown}"]`);
      card.style.opacity = item ? "1" : "0";
      if (!item) return;
      card.style.transform = `translateY(${item.offsetTop}px)`;
      card.style.height = `${item.offsetHeight}px`;
    };
    place();
    // Slides only once placed: the first position is not animated.
    const frame = requestAnimationFrame(() => (card.dataset.ready = "true"));
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [shown]);

  const link = (view: FramingView, children: React.ReactNode) => (
    <ViewLink
      href={hrefs[view]}
      data-view={view}
      aria-current={current === view ? "step" : undefined}
      onClick={() => setClicked({ view, from: current })}
      className={itemClass(shown === view)}
    >
      {children}
    </ViewLink>
  );

  return (
    <nav aria-label={t.stepsLabel} className="relative">
      <div
        ref={cardRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 rounded-2xl border border-[var(--select-border)] bg-[var(--select-bg)] opacity-0 data-[ready=true]:transition-[transform,height] data-[ready=true]:duration-[var(--duration-slide)] data-[ready=true]:ease-[var(--ease-out)] motion-reduce:transition-none"
      />
      <ol ref={listRef} className="relative flex flex-col gap-1">
        {steps.map((s) => (
          <li key={s.step}>
            {link(
              s.step,
              <>
                <span className="text-body-md font-semibold text-foreground">
                  {t.steps[s.step]}
                </span>
                <span className="flex min-w-0 items-center gap-2 text-caption text-muted-foreground">
                  {s.status === "confirmed" ? (
                    <IconCheck
                      aria-hidden
                      className={cn(
                        "-mx-0.5 size-3 shrink-0",
                        CHECK[framingStepTone[s.status]],
                      )}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        DOT[framingStepTone[s.status]],
                      )}
                    />
                  )}
                  <span className="sr-only">{t.statuses[s.status]} :</span>
                  <span className="truncate">{s.line}</span>
                </span>
              </>,
            )}
          </li>
        ))}
        <li>
          {link(
            "summary",
            <span className="text-body-md font-semibold text-foreground">
              {t.summaryStep}
            </span>,
          )}
        </li>
      </ol>
    </nav>
  );
}
